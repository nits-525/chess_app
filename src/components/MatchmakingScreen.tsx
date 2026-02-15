import React, { useState } from 'react';

interface MatchmakingScreenProps {
    onJoinQueue: () => Promise<void>;
    onCancel: () => void;
    isSearching: boolean;
}

const MatchmakingScreen: React.FC<MatchmakingScreenProps> = ({
    onJoinQueue,
    onCancel,
    isSearching,
}) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleFindGame = async () => {
        setIsLoading(true);
        try {
            await onJoinQueue();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="matchmaking-screen">
            <div className="matchmaking-card">
                <div className="logo-container">
                    <div className="chess-logo">♔</div>
                    <h1 className="app-title">Chess Arena</h1>
                    <p className="app-subtitle">Anonymous Real-Time Chess</p>
                </div>

                {!isSearching ? (
                    <button
                        className="btn btn-primary btn-find-game"
                        onClick={handleFindGame}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="btn-loading">
                                <span className="spinner" />
                                Connecting...
                            </span>
                        ) : (
                            <>
                                <span className="btn-icon">⚔️</span>
                                Find Game
                            </>
                        )}
                    </button>
                ) : (
                    <div className="searching-container">
                        <div className="searching-animation">
                            <div className="searching-ring" />
                            <div className="searching-ring ring-2" />
                            <div className="searching-ring ring-3" />
                            <span className="searching-icon">♟</span>
                        </div>
                        <p className="searching-text">Searching for opponent...</p>
                        <button className="btn btn-cancel" onClick={onCancel}>
                            Cancel
                        </button>
                    </div>
                )}

                <div className="game-info">
                    <div className="info-item">
                        <span className="info-icon">⏱️</span>
                        <span>5 min per side</span>
                    </div>
                    <div className="info-item">
                        <span className="info-icon">👤</span>
                        <span>Anonymous play</span>
                    </div>
                    <div className="info-item">
                        <span className="info-icon">🌐</span>
                        <span>Real-time sync</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatchmakingScreen;
