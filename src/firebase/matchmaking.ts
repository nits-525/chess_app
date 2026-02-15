import {
    ref,
    runTransaction,
    onDisconnect,
    remove,
    set,
    serverTimestamp,
    get,
} from 'firebase/database';
import { database } from './firebaseConfig';

export interface MatchResult {
    gameId: string;
    color: 'w' | 'b';
    opponentId: string;
}

export async function joinQueue(
    userId: string,
    onMatched: (result: MatchResult) => void
): Promise<() => void> {
    const queueRef = ref(database, 'queue');

    const result = await runTransaction(queueRef, (currentQueue) => {
        if (currentQueue === null) {
            // Queue is empty — add ourselves
            return { userId, timestamp: Date.now() };
        }

        if (currentQueue.userId === userId) {
            // Already in queue
            return currentQueue;
        }

        // Found an opponent — clear the queue
        return null;
    });

    if (result.committed) {
        const snapshot = result.snapshot;

        if (snapshot.exists() && snapshot.val()?.userId === userId) {
            // We're waiting in queue — set up disconnect cleanup
            const userQueueRef = ref(database, 'queue');
            onDisconnect(userQueueRef).remove();

            // Now listen for when queue empties (opponent found us)
            const { onValue, off } = await import('firebase/database');
            const unsubscribe = onValue(queueRef, async (snap) => {
                if (!snap.exists()) {
                    // Queue was cleared — check if a game was created for us
                    off(queueRef);
                    // Look for our game
                    const gamesRef = ref(database, 'games');
                    const gamesSnap = await get(gamesRef);
                    if (gamesSnap.exists()) {
                        const games = gamesSnap.val();
                        for (const [gameId, game] of Object.entries(games)) {
                            const g = game as Record<string, unknown>;
                            if (g.white === userId) {
                                onMatched({
                                    gameId,
                                    color: 'w',
                                    opponentId: g.black as string,
                                });
                                return;
                            }
                            if (g.black === userId) {
                                onMatched({
                                    gameId,
                                    color: 'b',
                                    opponentId: g.white as string,
                                });
                                return;
                            }
                        }
                    }
                }
            });

            return () => {
                off(queueRef);
                remove(userQueueRef);
            };
        } else {
            // Queue was null/cleared => we matched with someone
            // We are the second player — create the game
            return await createGame(userId, queueRef, onMatched);
        }
    }

    // Fallback — shouldn't hit
    return () => { };
}

async function createGame(
    userId: string,
    queueRef: ReturnType<typeof ref>,
    onMatched: (result: MatchResult) => void
): Promise<() => void> {
    // Re-read queue to get opponent info — transaction already cleared it
    // The opponent was in queue; we need their ID.
    // Since the transaction returns the snapshot before our change, let's handle differently

    // Actually, let's redo this more cleanly with a different approach:
    // We'll use a simpler queue-based matchmaking

    return () => { };
}

// ---- Cleaner matchmaking approach ----

export async function joinMatchmaking(
    userId: string,
    onMatched: (result: MatchResult) => void
): Promise<() => void> {
    const queueRef = ref(database, 'queue');

    // Try to atomically match or join
    const transactionResult = await runTransaction(queueRef, (currentQueue) => {
        if (currentQueue === null) {
            // Queue empty — we join as waiting player
            return { userId, timestamp: Date.now() };
        }

        if (currentQueue.userId === userId) {
            // We're already in queue
            return currentQueue;
        }

        // There's someone waiting — we'll handle game creation after transaction
        // Return undefined to abort (don't modify queue yet)
        return;
    });

    if (transactionResult.committed && transactionResult.snapshot.exists()) {
        const data = transactionResult.snapshot.val();

        if (data.userId === userId) {
            // We joined the queue — wait for match
            const { onValue, off } = await import('firebase/database');
            const userQueueRef = ref(database, 'queue');
            onDisconnect(userQueueRef).remove();

            // Poll for game creation targeting us
            const gameCheckRef = ref(database, `playerGames/${userId}`);
            const unsubscribe = onValue(gameCheckRef, (snap) => {
                if (snap.exists()) {
                    const { gameId, color, opponentId } = snap.val();
                    off(gameCheckRef);
                    onMatched({ gameId, color, opponentId });
                }
            });

            return () => {
                off(gameCheckRef);
                remove(userQueueRef);
                remove(gameCheckRef);
            };
        }
    }

    // Transaction aborted — there's an opponent in queue
    // Read queue to get opponent
    const queueSnap = await get(queueRef);
    if (queueSnap.exists()) {
        const opponent = queueSnap.val();
        if (opponent.userId && opponent.userId !== userId) {
            const opponentId = opponent.userId;
            const gameId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            // Create the game
            const gameRef = ref(database, `games/${gameId}`);
            await set(gameRef, {
                white: opponentId, // First in queue is white
                black: userId,
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                activeColor: 'w',
                whiteTimeRemaining: 5 * 60 * 1000,
                blackTimeRemaining: 5 * 60 * 1000,
                lastMoveTimestamp: Date.now(),
                status: 'active',
                winner: null,
                createdAt: serverTimestamp(),
            });

            // Notify the waiting opponent
            const opponentGameRef = ref(database, `playerGames/${opponentId}`);
            await set(opponentGameRef, {
                gameId,
                color: 'w',
                opponentId: userId,
            });

            // Clear the queue
            await remove(queueRef);

            // Notify ourselves
            onMatched({
                gameId,
                color: 'b',
                opponentId,
            });

            return () => { };
        }
    }

    return () => { };
}

export async function leaveQueue(userId: string): Promise<void> {
    const queueRef = ref(database, 'queue');
    const snap = await get(queueRef);
    if (snap.exists() && snap.val()?.userId === userId) {
        await remove(queueRef);
    }
    const playerGameRef = ref(database, `playerGames/${userId}`);
    await remove(playerGameRef);
}
