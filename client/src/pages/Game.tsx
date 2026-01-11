import React, { useState, useEffect, useMemo, useRef } from 'react';
// --- WebSocket setup ---

import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { PlayerInfo } from '@/components/chess/PlayerInfo';
import { GamePanel } from '@/components/chess/GamePanel';
import type { Move as MoveListMove } from '@/components/chess/MoveList';
import { useAuth } from '@/hooks/use-auth';
import * as api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Chess, Move } from 'chess.js';

const boardColorMap = {
  "blue-marble.jpg": { light: "210 80% 86%", dark: "210 85% 40%", highlight: "50 100% 60%" },
  "blue.png": { light: "210 80% 85%", dark: "215 85% 38%", highlight: "50 100% 60%" },
  "wood3.jpg": { light: "38 42% 85%", dark: "32 56% 47%", highlight: "50 100% 60%" },
  "canvas2.jpg": { light: "51 24% 85%", dark: "53 46% 38%", highlight: "50 100% 60%" },
  "default": { light: "210 30% 85%", dark: "210 70% 50%", highlight: "50 100% 60%" },
};

import { Button } from '@/components/ui/button';
import { useSocket } from '@/context/SocketContext';

const Game = () => {
  // --- WebSocket state and ref ---
  const { socket } = useSocket();
  // const wsRef = useRef<Socket | null>(null); // Removed local ref
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [gameState, setGameState] = useState<api.GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moves, setMoves] = useState<MoveListMove[]>([]);
  const [theme, setTheme] = useState("cardinal");
  const [board, setBoard] = useState("wood.jpg");
  const [whiteTimeLeft, setWhiteTimeLeft] = useState(0);
  const [blackTimeLeft, setBlackTimeLeft] = useState(0);
  const [gameOver, setGameOver] = useState<{ winner: string; reason: string } | null>(null);
  const [gameNotFound, setGameNotFound] = useState(false);
  const [whitePlayerInfo, setWhitePlayerInfo] = useState<{ username: string; rating: number } | null>(null);
  const [blackPlayerInfo, setBlackPlayerInfo] = useState<{ username: string; rating: number } | null>(null);

  // Chess instance for parsing moves - separate instance for tracking full game
  const chess = useMemo(() => new Chess(), []);
  const chessHistory = useRef<Chess>(new Chess()); // Keep full game history
  const whiteBaseRef = useRef<number>(0);
  const blackBaseRef = useRef<number>(0);
  const tsBaseRef = useRef<number>(0);
  const fenBaseRef = useRef<string>('');
  const gameStartedRef = useRef<boolean>(false); // Timer only starts after white's first move

  const syncMovesFromFen = React.useCallback((targetFen: string) => {
    const historyChess = chessHistory.current;
    const beforeFen = historyChess.fen();
    if (beforeFen === targetFen) return;
    const legalMoves = historyChess.moves({ verbose: true }) as Move[];
    let applied = false;
    for (const move of legalMoves) {
      historyChess.move(move);
      if (historyChess.fen() === targetFen) {
        applied = true;
        break;
      }
      historyChess.undo();
    }
    if (applied) {
      const history = historyChess.history({ verbose: true }) as Move[];
      const movesList: MoveListMove[] = [];
      for (let i = 0; i < history.length; i += 2) {
        const whiteMove = history[i];
        const blackMove = history[i + 1];
        movesList.push({
          number: Math.floor(i / 2) + 1,
          white: whiteMove.san,
          black: blackMove?.san,
        });
      }
      setMoves(movesList);
    } else {
      chessHistory.current = new Chess(targetFen);
      setMoves([]);
    }
  }, [chessHistory]);

  const computeTimes = React.useCallback(() => {
    const ts = tsBaseRef.current;
    if (!ts || gameOver) return;

    // If game hasn't started yet, show full time for both players (no countdown)
    if (!gameStartedRef.current) {
      setWhiteTimeLeft(whiteBaseRef.current);
      setBlackTimeLeft(blackBaseRef.current);
      return;
    }

    let isWhiteTurnLocal = true;
    try {
      chess.load(fenBaseRef.current);
      isWhiteTurnLocal = chess.turn() === 'w';
    } catch { void 0 }
    const elapsed = Date.now() - ts;
    if (isWhiteTurnLocal) {
      setWhiteTimeLeft(Math.max(0, whiteBaseRef.current - elapsed));
      setBlackTimeLeft(blackBaseRef.current);
    } else {
      setBlackTimeLeft(Math.max(0, blackBaseRef.current - elapsed));
      setWhiteTimeLeft(whiteBaseRef.current);
    }
  }, [gameOver, chess, whiteBaseRef, blackBaseRef, fenBaseRef, tsBaseRef, gameStartedRef]);

  // Set board colors
  useEffect(() => {
    const colors = boardColorMap[board] || boardColorMap["default"];
    const root = document.documentElement;
    root.style.setProperty('--chess-light', colors.light);
    root.style.setProperty('--chess-dark', colors.dark);
    root.style.setProperty('--chess-highlight', colors.highlight);
  }, [board]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const isInitialLoadRef = useRef(true);
  // Reset initial-load flag ONLY when gameId changes
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [gameId]);

  // Track if this is the initial load

  // Infer a timeout result when the server has already deleted the game (404)
  const claimingTimeoutRef = useRef(false);
  const inferTimeoutOutcome = React.useCallback(() => {
    if (!gameState) return null;
    try {
      chess.load(gameState.fen);
      const turn = chess.turn();
      const elapsed = Date.now() - gameState.lastMoveTimestamp;
      if (turn === 'w') {
        if (gameState.whiteTimeLeftMs - elapsed <= 0) {
          return { winner: 'black', reason: 'timeout' as const };
        }
      } else {
        if (gameState.blackTimeLeftMs - elapsed <= 0) {
          return { winner: 'white', reason: 'timeout' as const };
        }
      }
    } catch {
      return null;
    }
    return null;
  }, [gameState, chess]);

  // Fetch game state
  // --- WebSocket: connect on mount ---
  useEffect(() => {
    if (gameId && isAuthenticated && user?.userId && !gameOver && socket) {

      const onConnect = () => {
        console.log('[Game] Socket connected, joining room');
        socket.emit('join_game', gameId);
      };

      const onGameState = (newState: api.GameState) => {
        setGameState(newState);
        whiteBaseRef.current = newState.whiteTimeLeftMs;
        blackBaseRef.current = newState.blackTimeLeftMs;
        tsBaseRef.current = newState.lastMoveTimestamp;
        fenBaseRef.current = newState.fen;
        gameStartedRef.current = newState.gameStarted ?? false;
        computeTimes();
        syncMovesFromFen(newState.fen);
      };

      const onMoveApplied = (payload: { gameId: string, state: api.GameState }) => {
        syncMovesFromFen(payload.state.fen);
      };

      const onGameOver = (outcome: { winner: string, reason: string }) => {
        console.log('[Game] Received game_over event:', outcome);
        setGameOver(outcome);
        toast({
          title: 'Game Over',
          description: outcome.winner === 'draw'
            ? `Game ended in a draw by ${outcome.reason}`
            : `${outcome.winner} wins by ${outcome.reason}`,
        });
      };

      // Listeners
      socket.on('connect', onConnect);
      socket.on('game_state', onGameState);
      socket.on('move_applied', onMoveApplied);
      socket.on('game_over', onGameOver);

      // Initial Join
      if (socket.connected) {
        console.log('[Game] Joining game room (initial)', gameId);
        socket.emit('join_game', gameId);
      }

      return () => {
        socket.off('connect', onConnect);
        socket.off('game_state', onGameState);
        socket.off('move_applied', onMoveApplied);
        socket.off('game_over', onGameOver);
      };
    }
  }, [gameId, isAuthenticated, user?.userId, gameOver, socket, computeTimes, syncMovesFromFen]);


  // Safety timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('[Game] Safety timeout triggered');
        setLoading(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);


  // Fetch game state
  useEffect(() => {
    // Always attempt to load... (rest of logic)
    if (!gameId || !isAuthenticated || gameNotFound) {
      if (isInitialLoadRef.current) setLoading(false);
      return;
    }

    setGameNotFound(false);

    const fetchGameState = async () => {
      console.log('[Game] fetchGameState started', { gameId, isAuthenticated, user });

      if (gameOver || gameNotFound) {
        if (isInitialLoadRef.current) setLoading(false);
        return;
      }

      try {
        if (isInitialLoadRef.current) setLoading(true);
        const token = localStorage.getItem('auth_token');
        if (!token) throw new Error('No token');

        // Check active game
        const activeGameForUser = await api.getGameIdForUser(token, user.userId);
        let currentActualGameId = gameId;

        if (activeGameForUser && activeGameForUser.gameId !== gameId) {
          navigate(`/game/${activeGameForUser.gameId}`);
          return;
        } else if (activeGameForUser) {
          currentActualGameId = activeGameForUser.gameId;
        } else if (!activeGameForUser && gameId) {
          // Spectator or finished
          currentActualGameId = gameId;
        } else {
          setGameNotFound(true);
          setLoading(false);
          return;
        }

        const state = await api.getGameState(token, currentActualGameId);
        setGameState(state);
        whiteBaseRef.current = state.whiteTimeLeftMs;
        blackBaseRef.current = state.blackTimeLeftMs;
        tsBaseRef.current = state.lastMoveTimestamp;
        fenBaseRef.current = state.fen;
        gameStartedRef.current = state.gameStarted ?? false;
        computeTimes();
        chess.load(state.fen);
        syncMovesFromFen(state.fen);

        if (isInitialLoadRef.current) {
          chessHistory.current = new Chess();
          setMoves([]);
          // Fetch players
          try {
            const [whitePlayer, blackPlayer] = await Promise.all([
              api.getUserById(state.whitePlayerId, token),
              api.getUserById(state.blackPlayerId, token)
            ]);
            setWhitePlayerInfo({ username: whitePlayer.username, rating: whitePlayer?.[state.timeControlKey] ?? 1200 });
            setBlackPlayerInfo({ username: blackPlayer.username, rating: blackPlayer?.[state.timeControlKey] ?? 1200 });
          } catch (err) {
            // Fallback
          }
        }
      } catch (err: unknown) {
        // Error handling
        const error = err as Error & { status?: number };
        if (error.status === 404 || error.message?.includes('404')) {
          setGameNotFound(true);
          if (gameOver) { setLoading(false); return; }
          const inferred = inferTimeoutOutcome();
          if (inferred) { setGameOver(inferred); setLoading(false); return; }
          setGameOver({ winner: 'unknown', reason: 'Game not found or concluded' });
        } else if (isInitialLoadRef.current) {
          setError(error.message);
        }
      } finally {
        console.log('[Game] fetchGameState finished/finally');
        if (isInitialLoadRef.current) {
          setLoading(false);
          isInitialLoadRef.current = false;
        }
      }
    };

    fetchGameState();

  }, [gameId, isAuthenticated, user, gameOver, gameNotFound, navigate, computeTimes, inferTimeoutOutcome, syncMovesFromFen]);

  // No toast: show modal for game over


  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      computeTimes();

      // Auto-claim timeout check - only after game has started
      if (!gameId || !user || !gameStartedRef.current) return;

      // We need to know current time left from state ref to avoid staleness
      // Actually computeTimes calls setWhiteTimeLeft etc, but we can't read those states immediately here?
      // Let's rely on refs or recalculate locally.
      const ts = tsBaseRef.current;
      if (!ts) return;

      // Re-calc to be sure
      let isWhiteTurnLocal = true;
      try {
        const tempChess = new Chess(fenBaseRef.current);
        isWhiteTurnLocal = tempChess.turn() === 'w';
      } catch { return; }

      const elapsed = Date.now() - ts;
      let timeLeft = 0;

      if (isWhiteTurnLocal) {
        timeLeft = Math.max(0, whiteBaseRef.current - elapsed);
      } else {
        timeLeft = Math.max(0, blackBaseRef.current - elapsed);
      }

      // Buffer of 1s to allow server to be authority or lag
      if (timeLeft <= 0) {
        // Only trigger if WE are the one observing it essentially (any logged in user can trigger it technically)
        // But let's prevent spam.
        if (!claimingTimeoutRef.current) {
          claimingTimeoutRef.current = true;
          console.log('[Game] Time is up! Claiming timeout...');
          const token = localStorage.getItem('auth_token');
          if (token) {
            api.claimTimeout(gameId, token)
              .then(() => console.log('Timeout claimed'))
              .catch(e => console.error('Claim failed', e))
              .finally(() => {
                // Don't reset claimingRef immediately to avoid spam loop if server lags
                setTimeout(() => { claimingTimeoutRef.current = false; }, 5000);
              });
          }
        }
      }

    }, 100);
    return () => clearInterval(interval);
  }, [gameOver, computeTimes, gameId, user]);

  const handleMoveAttempt = async (move: { from: string; to: string; promotion?: string }) => {
    if (!gameId || !user || !gameState || gameOver) return;

    // Check if it's the user's turn
    try {
      chess.load(gameState.fen);
    } catch (e) {
      console.error('Failed to load FEN for move validation:', e);
      return;
    }

    const turn = chess.turn();
    const isWhiteTurn = turn === 'w';
    const isUserWhite = user.userId === gameState.whitePlayerId;
    const isUserBlack = user.userId === gameState.blackPlayerId;

    if ((isWhiteTurn && !isUserWhite) || (!isWhiteTurn && !isUserBlack)) {
      toast({
        title: 'Not your turn',
        description: 'Please wait for your opponent to move',
        variant: 'destructive',
      });
      return;
    }

    // Emit move via Socket.IO
    if (socket && socket.connected) {
      socket.emit('move', {
        gameId,
        move: {
          from: move.from,
          to: move.to,
          promotion: move.promotion
        }
      });
    } else {
      toast({
        title: 'Connection Error',
        description: 'Not connected to game server. Reconnecting...',
        variant: 'destructive',
      });
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  let content;

  const handleResign = async () => {
    if (!gameId || gameOver) return;
    if (!confirm('Are you sure you want to resign?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      if (token) await api.resignGame(gameId, token);
    } catch (err) {
      console.error('Resign failed', err);
      toast({ title: 'Resign failed', variant: 'destructive' });
    }
  };

  if (!isAuthenticated || !user) {
    content = (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 text-destructive">Not authenticated</div>
          <div className="text-muted-foreground mb-4">You must be logged in to view this game.</div>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  } else if (loading) {
    content = (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Loading game...</div>
          <div className="text-muted-foreground">Please wait</div>
        </div>
      </div>
    );
  } else if ((error || gameNotFound) && !gameState) {
    content = (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 text-destructive">Game Not Found</div>
          <div className="text-muted-foreground mb-4">{error || 'The game you are looking for does not exist. It may have ended.'}</div>
          <button
            onClick={() => navigate('/play')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Back to Matchmaking
          </button>
        </div>
      </div>
    );
  } else {
    // Determine player colors and info
    const isUserWhite = user.userId === gameState.whitePlayerId;
    const isUserBlack = user.userId === gameState.blackPlayerId;

    // Determine turn
    let isWhiteTurn = true;
    try {
      chess.load(gameState.fen);
      const turn = chess.turn();
      isWhiteTurn = turn === 'w';
    } catch (e) {
      console.error('Failed to load FEN to determine turn:', e);
    }

    // Get player names and ratings
    const whitePlayerName = whitePlayerInfo?.username || (isUserWhite ? user.username : 'Loading...');
    const blackPlayerName = blackPlayerInfo?.username || (isUserBlack ? user.username : 'Loading...');
    const whitePlayerRating = whitePlayerInfo?.rating || 1200;
    const blackPlayerRating = blackPlayerInfo?.rating || 1200;

    // Calculate if board should be disabled
    const isMyTurn = (isWhiteTurn && isUserWhite) || (!isWhiteTurn && isUserBlack);
    const boardDisabled = gameOver !== null || !isMyTurn;

    content = (
      <div className="flex flex-col md:flex-row min-h-screen">
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-auto">
          <div className="w-full max-w-[90vw] sm:max-w-[600px] flex flex-col gap-2">
            {/* Controls */}
            <div className="flex justify-between items-center bg-card p-2 rounded border">
              <div className="text-sm font-semibold">Game Controls</div>
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" onClick={handleResign} disabled={!!gameOver}>
                  Resign
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                  Home
                </Button>
              </div>
            </div>

            {/* Theme/Board selectors - could be moved to settings */}
            <div className="flex gap-2">
              <select
                className="border p-2 rounded bg-background text-foreground text-xs"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="cardinal">Cardinal</option>
                <option value="california">California</option>
                <option value="cburnett">CBurnett</option>
              </select>
              <select
                className="border p-2 rounded bg-background text-foreground text-xs"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
              >
                <option value="wood.jpg">Wood</option>
                <option value="blue-marble.jpg">Blue Marble</option>
                <option value="wood3.jpg">Wood 3</option>
              </select>
            </div>

            {/* Opponent info (always top) */}
            {isUserWhite ? (
              <PlayerInfo
                username={blackPlayerName}
                rating={blackPlayerRating}
                isTop={true}
                timeLeft={formatTime(blackTimeLeft)}
                isActive={!isWhiteTurn && !gameOver}
              />
            ) : (
              <PlayerInfo
                username={whitePlayerName}
                rating={whitePlayerRating}
                isTop={true}
                timeLeft={formatTime(whiteTimeLeft)}
                isActive={isWhiteTurn && !gameOver}
              />
            )}

            {/* Chess board */}
            <ChessBoard
              theme={theme}
              boardImage={board}
              fen={gameState.fen}
              onMoveAttempt={handleMoveAttempt}
              disabled={boardDisabled}
              flipped={!isUserWhite} // Flip board if user is black
            />

            {/* User info (always bottom) */}
            {isUserWhite ? (
              <PlayerInfo
                username={whitePlayerName}
                rating={whitePlayerRating}
                isTop={false}
                timeLeft={formatTime(whiteTimeLeft)}
                isActive={isWhiteTurn && !gameOver}
              />
            ) : (
              <PlayerInfo
                username={blackPlayerName}
                rating={blackPlayerRating}
                isTop={false}
                timeLeft={formatTime(blackTimeLeft)}
                isActive={!isWhiteTurn && !gameOver}
              />
            )}

            {/* Game over message */}
            {gameOver && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="relative bg-card border-2 border-border rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                  {/* Header with gradient background */}
                  <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-6 border-b border-border">
                    <h2 className="text-3xl font-bold text-center text-foreground">
                      Game Over
                    </h2>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6">
                    {/* Result Display */}
                    <div className="text-center">
                      {gameOver.winner === 'draw' ? (
                        <>
                          <div className="text-6xl mb-4">🤝</div>
                          <div className="text-2xl font-bold text-yellow-500 mb-2">Draw</div>
                          <div className="text-sm text-muted-foreground">
                            by <span className="capitalize font-medium">{gameOver.reason}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-6xl mb-4">
                            {gameOver.winner === 'white' ? '♔' : '♚'}
                          </div>
                          <div className="text-2xl font-bold text-green-500 mb-2">
                            {gameOver.winner === 'white' ? whitePlayerName : blackPlayerName} Wins!
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {gameOver.winner === 'white' ? blackPlayerName : whitePlayerName} lost by{' '}
                            <span className="capitalize font-medium">{gameOver.reason}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Rating Changes */}
                    <div className="bg-secondary/30 rounded-xl p-4">
                      {(gameOver as any).noRatingChange ? (
                        <div className="text-center">
                          <div className="text-sm font-medium text-muted-foreground mb-1">
                            Rating Changes
                          </div>
                          <div className="text-base text-yellow-600 dark:text-yellow-500 font-semibold">
                            No rating change
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            (Both players must move for ratings to change)
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-sm font-medium text-center text-muted-foreground mb-3">
                            Rating Changes
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {/* White Player */}
                            <div className="bg-card rounded-lg p-3 text-center border border-border">
                              <div className="text-xs text-muted-foreground mb-1">
                                {whitePlayerName}
                              </div>
                              <div className="text-sm text-muted-foreground mb-1">
                                {whitePlayerRating}
                              </div>
                              <div
                                className={`text-2xl font-bold ${(gameOver as any).whiteRatingChange > 0
                                    ? 'text-green-500'
                                    : (gameOver as any).whiteRatingChange < 0
                                      ? 'text-red-500'
                                      : 'text-muted-foreground'
                                  }`}
                              >
                                {(gameOver as any).whiteRatingChange > 0 ? '+' : ''}
                                {(gameOver as any).whiteRatingChange || 0}
                              </div>
                            </div>

                            {/* Black Player */}
                            <div className="bg-card rounded-lg p-3 text-center border border-border">
                              <div className="text-xs text-muted-foreground mb-1">
                                {blackPlayerName}
                              </div>
                              <div className="text-sm text-muted-foreground mb-1">
                                {blackPlayerRating}
                              </div>
                              <div
                                className={`text-2xl font-bold ${(gameOver as any).blackRatingChange > 0
                                    ? 'text-green-500'
                                    : (gameOver as any).blackRatingChange < 0
                                      ? 'text-red-500'
                                      : 'text-muted-foreground'
                                  }`}
                              >
                                {(gameOver as any).blackRatingChange > 0 ? '+' : ''}
                                {(gameOver as any).blackRatingChange || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
                        onClick={() => navigate('/play')}
                      >
                        Play Again
                      </button>
                      <button
                        className="flex-1 px-4 py-3 rounded-lg bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-all border border-border"
                        onClick={() => navigate('/')}
                      >
                        Home
                      </button>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    aria-label="Close"
                    onClick={() => navigate('/play')}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-secondary hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="w-full md:w-80 md:border-l border-t md:border-t-0 p-4">
          <GamePanel className="h-full" moves={moves} />
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      {content}
    </MainLayout>
  );
};

export default Game;

