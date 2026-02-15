import { ChessEngine, PieceColor, GameStatus, MoveResult } from '../engine/ChessEngine';
import {
    listenToGame,
    pushMove,
    setGameFinished,
    setupDisconnectHandler,
    cancelDisconnectHandler,
    cleanupGame,
    cleanupPlayerGame,
    GameState,
    MoveUpdate,
} from '../firebase/gameSync';

export interface GameControllerState {
    fen: string;
    turn: PieceColor;
    status: GameStatus;
    gameStatus: 'active' | 'finished';
    whiteTimeRemaining: number;
    blackTimeRemaining: number;
    lastMoveTimestamp: number;
    activeColor: PieceColor;
    winner: string | null;
    isInCheck: boolean;
}

export type GameControllerCallback = (state: GameControllerState) => void;

const DEFAULT_TIME = 5 * 60 * 1000; // 5 minutes in ms

export class GameController {
    private engine: ChessEngine;
    private gameId: string;
    private userId: string;
    private playerColor: PieceColor;
    private opponentId: string;
    private callback: GameControllerCallback;
    private unsubscribeListener: (() => void) | null = null;

    private whiteTimeRemaining = DEFAULT_TIME;
    private blackTimeRemaining = DEFAULT_TIME;
    private lastMoveTimestamp = Date.now();
    private activeColor: PieceColor = 'w';
    private gameStatus: 'active' | 'finished' = 'active';
    private winner: string | null = null;

    constructor(
        gameId: string,
        userId: string,
        playerColor: PieceColor,
        opponentId: string,
        callback: GameControllerCallback
    ) {
        this.engine = new ChessEngine();
        this.gameId = gameId;
        this.userId = userId;
        this.playerColor = playerColor;
        this.opponentId = opponentId;
        this.callback = callback;
    }

    start(): void {
        // Setup disconnect handler — if we disconnect, opponent wins
        setupDisconnectHandler(this.gameId, this.userId, this.opponentId);

        // Listen for game state changes
        this.unsubscribeListener = listenToGame(this.gameId, (state) => {
            if (state) {
                this.handleRemoteUpdate(state);
            }
        });
    }

    private handleRemoteUpdate(state: GameState): void {
        // Load the FEN from remote
        this.engine.loadFEN(state.fen);
        this.whiteTimeRemaining = state.whiteTimeRemaining;
        this.blackTimeRemaining = state.blackTimeRemaining;
        this.lastMoveTimestamp = state.lastMoveTimestamp;
        this.activeColor = state.activeColor;
        this.gameStatus = state.status;
        this.winner = state.winner;

        this.emitState();
    }

    async tryMove(from: string, to: string, promotion?: string): Promise<boolean> {
        // Only allow moves on our turn
        if (this.activeColor !== this.playerColor) return false;
        if (this.gameStatus !== 'active') return false;
        if (this.engine.getTurn() !== this.playerColor) return false;

        // Calculate elapsed time
        const now = Date.now();
        const elapsed = now - this.lastMoveTimestamp;

        // Deduct time from active player
        let whiteTime = this.whiteTimeRemaining;
        let blackTime = this.blackTimeRemaining;

        if (this.activeColor === 'w') {
            whiteTime = Math.max(0, whiteTime - elapsed);
        } else {
            blackTime = Math.max(0, blackTime - elapsed);
        }

        // Check for timeout
        if (
            (this.activeColor === 'w' && whiteTime <= 0) ||
            (this.activeColor === 'b' && blackTime <= 0)
        ) {
            const winnerId =
                this.activeColor === 'w'
                    ? this.getPlayerIdByColor('b')
                    : this.getPlayerIdByColor('w');
            await setGameFinished(this.gameId, winnerId);
            return false;
        }

        // Try the move on the engine
        const result: MoveResult = this.engine.makeMove({ from, to, promotion });
        if (!result.success) return false;

        // Prepare the update
        const nextColor: PieceColor = this.activeColor === 'w' ? 'b' : 'w';
        const moveUpdate: MoveUpdate = {
            fen: result.fen,
            activeColor: nextColor,
            whiteTimeRemaining: whiteTime,
            blackTimeRemaining: blackTime,
            lastMoveTimestamp: now,
        };

        // Check for game end conditions
        if (result.status === 'checkmate') {
            moveUpdate.status = 'finished';
            moveUpdate.winner = this.userId;
        } else if (result.status === 'stalemate' || result.status === 'draw') {
            moveUpdate.status = 'finished';
            moveUpdate.winner = null; // Draw
        }

        // Push to Firebase
        await pushMove(this.gameId, moveUpdate);
        return true;
    }

    async handleTimeout(): Promise<void> {
        if (this.gameStatus !== 'active') return;

        // The active player ran out of time — opponent wins
        const winnerId =
            this.activeColor === 'w'
                ? this.getPlayerIdByColor('b')
                : this.getPlayerIdByColor('w');

        await setGameFinished(this.gameId, winnerId);
    }

    private getPlayerIdByColor(color: PieceColor): string {
        if (this.playerColor === color) return this.userId;
        return this.opponentId;
    }

    getPlayerColor(): PieceColor {
        return this.playerColor;
    }

    getCurrentState(): GameControllerState {
        return {
            fen: this.engine.getFEN(),
            turn: this.engine.getTurn(),
            status: this.engine.getGameStatus(),
            gameStatus: this.gameStatus,
            whiteTimeRemaining: this.whiteTimeRemaining,
            blackTimeRemaining: this.blackTimeRemaining,
            lastMoveTimestamp: this.lastMoveTimestamp,
            activeColor: this.activeColor,
            winner: this.winner,
            isInCheck: this.engine.isInCheck(),
        };
    }

    private emitState(): void {
        this.callback(this.getCurrentState());
    }

    getEngine(): ChessEngine {
        return this.engine;
    }

    async destroy(): Promise<void> {
        if (this.unsubscribeListener) {
            this.unsubscribeListener();
            this.unsubscribeListener = null;
        }
        cancelDisconnectHandler(this.gameId);
        await cleanupPlayerGame(this.userId);
    }
}
