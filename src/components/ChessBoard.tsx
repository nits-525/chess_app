import React, { useState, useMemo, useCallback } from 'react';
import type { PieceColor } from '../engine/ChessEngine';
import type { GameController } from '../controller/GameController';
import type { Move, Square } from 'chess.js';

interface ChessBoardProps {
    fen: string;
    playerColor: PieceColor;
    isMyTurn: boolean;
    isGameActive: boolean;
    isInCheck: boolean;
    controller: GameController;
    onMoveMade?: () => void;
}

const PIECE_UNICODE: Record<string, string> = {
    wp: '♙', wn: '♘', wb: '♗', wr: '♖', wq: '♕', wk: '♔',
    bp: '♟', bn: '♞', bb: '♝', br: '♜', bq: '♛', bk: '♚',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function parseFEN(fen: string): (string | null)[][] {
    const rows = fen.split(' ')[0].split('/');
    return rows.map((row) => {
        const squares: (string | null)[] = [];
        for (const ch of row) {
            if (ch >= '1' && ch <= '8') {
                for (let i = 0; i < parseInt(ch); i++) squares.push(null);
            } else {
                const color = ch === ch.toUpperCase() ? 'w' : 'b';
                squares.push(color + ch.toLowerCase());
            }
        }
        return squares;
    });
}

function squareToNotation(row: number, col: number, flipped: boolean): Square {
    const r = flipped ? row : 7 - row;
    const c = flipped ? 7 - col : col;
    return (FILES[c] + RANKS[7 - r]) as Square;
}

const ChessBoard: React.FC<ChessBoardProps> = ({
    fen,
    playerColor,
    isMyTurn,
    isGameActive,
    isInCheck,
    controller,
    onMoveMade,
}) => {
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [legalMoves, setLegalMoves] = useState<Move[]>([]);
    const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
    const [showPromotion, setShowPromotion] = useState<{
        from: Square;
        to: Square;
    } | null>(null);

    const flipped = playerColor === 'b';
    const board = useMemo(() => parseFEN(fen), [fen]);

    // Find king position for check highlight
    const kingInCheck = useMemo(() => {
        if (!isInCheck) return null;
        const turn = fen.split(' ')[1];
        const kingChar = turn === 'w' ? 'wk' : 'bk';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === kingChar) {
                    return FILES[c] + RANKS[r];
                }
            }
        }
        return null;
    }, [board, isInCheck, fen]);

    const legalMoveSquares = useMemo(
        () => new Set(legalMoves.map((m) => m.to)),
        [legalMoves]
    );

    const handleSquareClick = useCallback(
        async (row: number, col: number) => {
            if (!isGameActive || !isMyTurn) return;

            const notation = squareToNotation(row, col, flipped);
            const displayRow = flipped ? 7 - row : row;
            const displayCol = flipped ? 7 - col : col;
            const piece = board[displayRow]?.[displayCol];

            if (selectedSquare) {
                if (notation === selectedSquare) {
                    // Deselect
                    setSelectedSquare(null);
                    setLegalMoves([]);
                    return;
                }

                if (legalMoveSquares.has(notation)) {
                    // Check for pawn promotion
                    // Board row: notation rank '1'..'8' -> index 7..0
                    const boardRow = 8 - parseInt(selectedSquare[1], 10);
                    const boardCol = FILES.indexOf(selectedSquare[0]);
                    const selectedPiece = board[boardRow]?.[boardCol];

                    const isPromotion =
                        selectedPiece &&
                        selectedPiece[1] === 'p' &&
                        ((selectedPiece[0] === 'w' && notation[1] === '8') ||
                            (selectedPiece[0] === 'b' && notation[1] === '1'));

                    if (isPromotion) {
                        setShowPromotion({ from: selectedSquare, to: notation });
                        return;
                    }

                    // Make the move
                    const success = await controller.tryMove(selectedSquare, notation);
                    if (success) {
                        setLastMove({ from: selectedSquare, to: notation });
                        onMoveMade?.();
                    }
                    setSelectedSquare(null);
                    setLegalMoves([]);
                    return;
                }

                // Clicked on own piece — re-select
                if (piece && piece[0] === playerColor) {
                    setSelectedSquare(notation);
                    const moves = controller.getEngine().getLegalMoves(notation);
                    setLegalMoves(moves);
                    return;
                }

                // Invalid target
                setSelectedSquare(null);
                setLegalMoves([]);
                return;
            }

            // No selection yet — select own piece
            if (piece && piece[0] === playerColor) {
                setSelectedSquare(notation);
                const moves = controller.getEngine().getLegalMoves(notation);
                setLegalMoves(moves);
            }
        },
        [
            isGameActive,
            isMyTurn,
            selectedSquare,
            legalMoveSquares,
            board,
            playerColor,
            flipped,
            controller,
            onMoveMade,
        ]
    );

    const handlePromotion = useCallback(
        async (piece: string) => {
            if (!showPromotion) return;
            const success = await controller.tryMove(
                showPromotion.from,
                showPromotion.to,
                piece
            );
            if (success) {
                setLastMove({ from: showPromotion.from, to: showPromotion.to });
                onMoveMade?.();
            }
            setShowPromotion(null);
            setSelectedSquare(null);
            setLegalMoves([]);
        },
        [showPromotion, controller, onMoveMade]
    );

    const renderSquare = (row: number, col: number) => {
        const displayRow = flipped ? 7 - row : row;
        const displayCol = flipped ? 7 - col : col;
        const piece = board[displayRow]?.[displayCol];
        const notation = squareToNotation(row, col, flipped);
        const isLight = (displayRow + displayCol) % 2 === 0;
        const isSelected = notation === selectedSquare;
        const isLegalTarget = legalMoveSquares.has(notation);
        const isLastMoveSquare =
            lastMove && (notation === lastMove.from || notation === lastMove.to);
        const isCheckSquare = notation === kingInCheck;

        let squareClass = `square ${isLight ? 'light' : 'dark'}`;
        if (isSelected) squareClass += ' selected';
        if (isLastMoveSquare) squareClass += ' last-move';
        if (isCheckSquare) squareClass += ' in-check';

        return (
            <div
                key={`${row}-${col}`}
                className={squareClass}
                onClick={() => handleSquareClick(row, col)}
            >
                {isLegalTarget && (
                    <div className={`legal-move-dot ${piece ? 'capture' : ''}`} />
                )}
                {piece && (
                    <span className={`piece ${piece[0] === 'w' ? 'white-piece' : 'black-piece'}`}>
                        {PIECE_UNICODE[piece]}
                    </span>
                )}
                {col === 0 && (
                    <span className="rank-label">
                        {flipped ? RANKS[7 - row] : RANKS[row]}
                    </span>
                )}
                {row === 7 && (
                    <span className="file-label">
                        {flipped ? FILES[7 - col] : FILES[col]}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="chess-board-container">
            <div className="chess-board">
                {Array.from({ length: 8 }, (_, row) =>
                    Array.from({ length: 8 }, (_, col) => renderSquare(row, col))
                )}
            </div>

            {showPromotion && (
                <div className="promotion-overlay">
                    <div className="promotion-dialog">
                        <span className="promotion-title">Promote to:</span>
                        <div className="promotion-options">
                            {['q', 'r', 'b', 'n'].map((p) => (
                                <button
                                    key={p}
                                    className="promotion-btn"
                                    onClick={() => handlePromotion(p)}
                                >
                                    {PIECE_UNICODE[playerColor + p]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChessBoard;
