import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    GameController,
    GameControllerState,
} from '../controller/GameController';
import ChessBoard from './ChessBoard';
import TimerDisplay from './TimerDisplay';
import type { PieceColor } from '../engine/ChessEngine';

interface GameScreenProps {
    gameId: string;
    userId: string;
    playerColor: PieceColor;
    opponentId: string;
    onGameEnd: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
    gameId,
    userId,
    playerColor,
    opponentId,
    onGameEnd,
}) => {
    const controllerRef = useRef<GameController | null>(null);
    const [gameState, setGameState] = useState<GameControllerState | null>(null);
    const [showGameOver, setShowGameOver] = useState(false);

    useEffect(() => {
        const controller = new GameController(
            gameId,
            userId,
            playerColor,
            opponentId,
            (state) => {
                setGameState(state);
                if (state.gameStatus === 'finished') {
                    setShowGameOver(true);
                }
            }
        );

        controllerRef.current = controller;
        controller.start();

        return () => {
            controller.destroy();
        };
    }, [gameId, userId, playerColor, opponentId]);

    const handleTimeout = useCallback(() => {
        controllerRef.current?.handleTimeout();
    }, []);

    if (!gameState || !controllerRef.current) {
        return (
            <div className="game-screen">
                <div className="loading-game">
                    <div className="spinner" />
                    <p>Loading game...</p>
                </div>
            </div>
        );
    }

    const isMyTurn = gameState.activeColor === playerColor;
    const isGameActive = gameState.gameStatus === 'active';

    const getResultText = () => {
        if (!showGameOver) return '';
        if (gameState.status === 'checkmate') {
            return gameState.winner === userId ? '🏆 Checkmate! You Win!' : '😞 Checkmate. You Lose.';
        }
        if (gameState.status === 'stalemate') return '🤝 Stalemate — Draw';
        if (gameState.status === 'draw') return '🤝 Draw';
        if (gameState.winner === userId) return '🏆 Opponent Disconnected — You Win!';
        if (gameState.winner === opponentId) return '😞 You Lost on Time';
        if (gameState.winner === null) return '🤝 Draw';
        return '🏁 Game Over';
    };

    return (
        <div className="game-screen">
            <div className="game-layout">
                <div className="game-sidebar sidebar-left">
                    <TimerDisplay
                        whiteTimeRemaining={gameState.whiteTimeRemaining}
                        blackTimeRemaining={gameState.blackTimeRemaining}
                        activeColor={gameState.activeColor}
                        lastMoveTimestamp={gameState.lastMoveTimestamp}
                        isGameActive={isGameActive}
                        onTimeout={handleTimeout}
                        playerColor={playerColor}
                    />
                </div>

                <div className="game-center">
                    <div className="turn-indicator">
                        {isGameActive && (
                            <span className={`turn-badge ${isMyTurn ? 'your-turn' : 'opponent-turn'}`}>
                                {isMyTurn ? '🟢 Your Turn' : '🔴 Opponent\'s Turn'}
                            </span>
                        )}
                        {gameState.isInCheck && isGameActive && (
                            <span className="check-badge">⚠️ Check!</span>
                        )}
                    </div>

                    <ChessBoard
                        fen={gameState.fen}
                        playerColor={playerColor}
                        isMyTurn={isMyTurn}
                        isGameActive={isGameActive}
                        isInCheck={gameState.isInCheck}
                        controller={controllerRef.current}
                    />

                    <div className="game-id-label">
                        Playing as {playerColor === 'w' ? '♔ White' : '♚ Black'}
                    </div>
                </div>
            </div>

            {showGameOver && (
                <div className="game-over-overlay">
                    <div className="game-over-modal">
                        <div className="game-over-result">{getResultText()}</div>
                        <button className="btn btn-primary" onClick={onGameEnd}>
                            Play Again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GameScreen;
