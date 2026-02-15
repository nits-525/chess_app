import { useState, useRef, useCallback, useEffect } from 'react';
import MatchmakingScreen from './components/MatchmakingScreen';
import GameScreen from './components/GameScreen';
import { joinMatchmaking, leaveQueue } from './firebase/matchmaking';
import { cleanupPlayerGame } from './firebase/gameSync';
import type { MatchResult } from './firebase/matchmaking';
import type { PieceColor } from './engine/ChessEngine';
import './index.css';

type AppState = 'idle' | 'matchmaking' | 'playing';

function generateUserId(): string {
    return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function App() {
    const [appState, setAppState] = useState<AppState>('idle');
    const [userId] = useState(() => generateUserId());
    const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
    const cancelRef = useRef<(() => void) | null>(null);

    const handleJoinQueue = useCallback(async () => {
        setAppState('matchmaking');

        const cancel = await joinMatchmaking(userId, (result: MatchResult) => {
            setMatchResult(result);
            setAppState('playing');
        });

        cancelRef.current = cancel;
    }, [userId]);

    const handleCancelSearch = useCallback(async () => {
        if (cancelRef.current) {
            cancelRef.current();
            cancelRef.current = null;
        }
        await leaveQueue(userId);
        setAppState('idle');
    }, [userId]);

    const handleGameEnd = useCallback(async () => {
        setMatchResult(null);
        await cleanupPlayerGame(userId);
        setAppState('idle');
    }, [userId]);

    useEffect(() => {
        return () => {
            if (cancelRef.current) {
                cancelRef.current();
            }
        };
    }, []);

    return (
        <div className="app">
            {(appState === 'idle' || appState === 'matchmaking') && (
                <MatchmakingScreen
                    onJoinQueue={handleJoinQueue}
                    onCancel={handleCancelSearch}
                    isSearching={appState === 'matchmaking'}
                />
            )}

            {appState === 'playing' && matchResult && (
                <GameScreen
                    gameId={matchResult.gameId}
                    userId={userId}
                    playerColor={matchResult.color as PieceColor}
                    opponentId={matchResult.opponentId}
                    onGameEnd={handleGameEnd}
                />
            )}
        </div>
    );
}

export default App;
