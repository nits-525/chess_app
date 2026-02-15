import {
    ref,
    onValue,
    update,
    remove,
    onDisconnect,
    off,
    get,
} from 'firebase/database';
import { database } from './firebaseConfig';
import type { PieceColor } from '../engine/ChessEngine';

export interface GameState {
    white: string;
    black: string;
    fen: string;
    activeColor: PieceColor;
    whiteTimeRemaining: number;
    blackTimeRemaining: number;
    lastMoveTimestamp: number;
    status: 'active' | 'finished';
    winner: string | null;
}

export interface MoveUpdate {
    fen: string;
    activeColor: PieceColor;
    whiteTimeRemaining: number;
    blackTimeRemaining: number;
    lastMoveTimestamp: number;
    status?: 'active' | 'finished';
    winner?: string | null;
}

export function listenToGame(
    gameId: string,
    callback: (state: GameState | null) => void
): () => void {
    const gameRef = ref(database, `games/${gameId}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val() as GameState);
        } else {
            callback(null);
        }
    });

    return () => {
        off(gameRef);
    };
}

export async function pushMove(
    gameId: string,
    moveUpdate: MoveUpdate
): Promise<void> {
    const gameRef = ref(database, `games/${gameId}`);
    await update(gameRef, moveUpdate);
}

export async function setGameFinished(
    gameId: string,
    winner: string | null,
): Promise<void> {
    const gameRef = ref(database, `games/${gameId}`);
    await update(gameRef, {
        status: 'finished',
        winner,
    });
}

export function setupDisconnectHandler(
    gameId: string,
    userId: string,
    opponentId: string
): void {
    const gameRef = ref(database, `games/${gameId}`);
    onDisconnect(gameRef).update({
        status: 'finished',
        winner: opponentId,
    });
}

export function cancelDisconnectHandler(gameId: string): void {
    const gameRef = ref(database, `games/${gameId}`);
    onDisconnect(gameRef).cancel();
}

export async function cleanupGame(gameId: string): Promise<void> {
    const gameRef = ref(database, `games/${gameId}`);
    await remove(gameRef);
}

export async function cleanupPlayerGame(userId: string): Promise<void> {
    const playerGameRef = ref(database, `playerGames/${userId}`);
    await remove(playerGameRef);
}

export async function getGameState(gameId: string): Promise<GameState | null> {
    const gameRef = ref(database, `games/${gameId}`);
    const snap = await get(gameRef);
    return snap.exists() ? (snap.val() as GameState) : null;
}
