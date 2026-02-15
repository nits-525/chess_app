import React, { useEffect, useRef, useState } from 'react';
import type { PieceColor } from '../engine/ChessEngine';

interface TimerDisplayProps {
    whiteTimeRemaining: number;
    blackTimeRemaining: number;
    activeColor: PieceColor;
    lastMoveTimestamp: number;
    isGameActive: boolean;
    onTimeout: () => void;
    playerColor: PieceColor;
}

function formatTime(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
    whiteTimeRemaining,
    blackTimeRemaining,
    activeColor,
    lastMoveTimestamp,
    isGameActive,
    onTimeout,
    playerColor,
}) => {
    const [displayWhite, setDisplayWhite] = useState(whiteTimeRemaining);
    const [displayBlack, setDisplayBlack] = useState(blackTimeRemaining);
    const frameRef = useRef<number>(0);
    const timeoutCalledRef = useRef(false);

    useEffect(() => {
        setDisplayWhite(whiteTimeRemaining);
        setDisplayBlack(blackTimeRemaining);
        timeoutCalledRef.current = false;
    }, [whiteTimeRemaining, blackTimeRemaining]);

    useEffect(() => {
        if (!isGameActive) {
            cancelAnimationFrame(frameRef.current);
            return;
        }

        const tick = () => {
            const now = Date.now();
            const elapsed = now - lastMoveTimestamp;

            if (activeColor === 'w') {
                const remaining = Math.max(0, whiteTimeRemaining - elapsed);
                setDisplayWhite(remaining);
                if (remaining <= 0 && !timeoutCalledRef.current) {
                    timeoutCalledRef.current = true;
                    onTimeout();
                    return;
                }
            } else {
                const remaining = Math.max(0, blackTimeRemaining - elapsed);
                setDisplayBlack(remaining);
                if (remaining <= 0 && !timeoutCalledRef.current) {
                    timeoutCalledRef.current = true;
                    onTimeout();
                    return;
                }
            }

            frameRef.current = requestAnimationFrame(tick);
        };

        frameRef.current = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(frameRef.current);
        };
    }, [
        activeColor,
        lastMoveTimestamp,
        whiteTimeRemaining,
        blackTimeRemaining,
        isGameActive,
        onTimeout,
    ]);

    const opponentColor = playerColor === 'w' ? 'b' : 'w';
    const topColor = opponentColor;
    const bottomColor = playerColor;

    const topTime = topColor === 'w' ? displayWhite : displayBlack;
    const bottomTime = bottomColor === 'w' ? displayWhite : displayBlack;

    const topActive = isGameActive && activeColor === topColor;
    const bottomActive = isGameActive && activeColor === bottomColor;

    const topUrgent = topTime < 30000;
    const bottomUrgent = bottomTime < 30000;

    return (
        <div className="timer-container">
            <div
                className={`timer-card ${topActive ? 'active' : ''} ${topUrgent ? 'urgent' : ''}`}
            >
                <div className="timer-label">
                    {topColor === 'w' ? '♔ White' : '♚ Black'}
                    {topColor !== playerColor ? ' (Opponent)' : ' (You)'}
                </div>
                <div className="timer-value">{formatTime(topTime)}</div>
                {topActive && <div className="timer-pulse" />}
            </div>

            <div
                className={`timer-card ${bottomActive ? 'active' : ''} ${bottomUrgent ? 'urgent' : ''}`}
            >
                <div className="timer-label">
                    {bottomColor === 'w' ? '♔ White' : '♚ Black'}
                    {bottomColor === playerColor ? ' (You)' : ' (Opponent)'}
                </div>
                <div className="timer-value">{formatTime(bottomTime)}</div>
                {bottomActive && <div className="timer-pulse" />}
            </div>
        </div>
    );
};

export default TimerDisplay;
