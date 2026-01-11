import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from '@/context/SocketContext';
import * as api from '@/lib/api';
import { Clock, Search, X, Loader2 } from 'lucide-react';

const Matchmaking = () => {
  type RatingKey = 'bullet' | 'blitz' | 'rapid' | 'puzzles';
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const [timeControls, setTimeControls] = useState<Record<string, api.TimeControl>>({});
  const [selectedTimeControl, setSelectedTimeControl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [activeQueueType, setActiveQueueType] = useState<string | null>(null);
  const [joinedAt, setJoinedAt] = useState<number | null>(null);
  const [waitTime, setWaitTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasJoinedQueue = useRef(false);
  const isMounted = useRef(true);

  const ratingKey = useMemo(() => (selectedTimeControl || 'blitz') as RatingKey, [selectedTimeControl]);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  // Check status on mount AND when socket reconnects
  useEffect(() => {
    const checkStatus = async () => {
      if (!isAuthenticated || !user) return;
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        // Load configs only once
        if (Object.keys(timeControls).length === 0) {
          const controls = await api.getTimeControls();
          if (isMounted.current) {
            setTimeControls(controls);
            const firstKey = Object.keys(controls)[0];
            if (firstKey && !selectedTimeControl) setSelectedTimeControl(firstKey);
          }
        }

        // Check matchmaking/game status
        const status = await api.getMatchmakingStatus(user.userId, token);
        if (isMounted.current) {
          if (status.inQueue) {
            setIsInQueue(true);
            setActiveQueueType(status.timeControl);
            setJoinedAt(status.joinedAt);
            hasJoinedQueue.current = true;
          } else if (status.hasGame && status.gameId) {
            // If we have a game, go to it immediately
            navigate(`/game/${status.gameId}`);
          } else {
            // Not in queue, no game. 
            // If we THOUGHT we were in queue (local state), but server says no, 
            // it means we might have been removed or matched-but-missed.
            // But getMatchmakingStatus checks activeGame. 
            // So if hasGame is false, we are truly idle.
            // Reset local state if needed.
            if (isInQueue) {
              setIsInQueue(false);
              setJoinedAt(null);
              hasJoinedQueue.current = false;
            }
          }
        }
      } catch (err) {
        if (isMounted.current) setError('Failed to sync status');
      }
    };

    checkStatus();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, isConnected]); // Run when connection restores

  // Socket Listener for Match Found
  useEffect(() => {
    if (!socket) return;

    const onMatchFound = (data: { gameId: string }) => {
      console.log('Match found!', data);
      setIsInQueue(false);
      setIsLoading(false);
      navigate(`/game/${data.gameId}`);
    };

    socket.on('match_found', onMatchFound);

    return () => {
      socket.off('match_found', onMatchFound);
    };
  }, [socket, navigate]);

  // Timer for wait time
  useEffect(() => {
    if (!isInQueue || !joinedAt) {
      setWaitTime(0);
      return;
    }
    const interval = setInterval(() => {
      setWaitTime(Date.now() - joinedAt);
    }, 500);
    return () => clearInterval(interval);
  }, [isInQueue, joinedAt]);

  const handleJoinQueue = async () => {
    if (!user || !selectedTimeControl || hasJoinedQueue.current || (activeQueueType && activeQueueType !== selectedTimeControl)) return;
    setIsLoading(true);
    setError(null);
    hasJoinedQueue.current = true;
    setActiveQueueType(selectedTimeControl);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No token');

      await api.joinMatchmaking(token, user.userId, selectedTimeControl, user[ratingKey]);

      setIsInQueue(true);
      setJoinedAt(Date.now());
      // No polling needed; socket will notify
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to join queue');
      setIsInQueue(false);
      hasJoinedQueue.current = false;
      setActiveQueueType(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveQueue = async () => {
    if (!user) return;
    setIsLoading(true);
    hasJoinedQueue.current = false;
    setActiveQueueType(null);
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await api.leaveMatchmaking(user.userId, token);
      }
      setIsInQueue(false);
      setJoinedAt(null);
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to leave queue');
      setIsInQueue(false); // Assume left anyway locally to reset UI
      setJoinedAt(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper formatting functions
  const formatTime = (ms: number) => {
    const safeMs = Math.max(0, ms);
    const seconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  const formatTimeControl = (control: api.TimeControl) => {
    if (!control) return '';
    const minutes = Math.floor(control.initialMs / 60000);
    const seconds = (control.initialMs % 60000) / 1000;
    const increment = control.incrementMs / 1000;
    const timeStr = `${minutes}${seconds > 0 ? `:${seconds.toString().padStart(2, '0')}` : ''}`;
    return increment > 0 ? `${timeStr}+${increment}` : timeStr;
  };
  const getTimeControlLabel = (key: string) => {
    const labels: Record<string, string> = {
      bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical',
      bullet_increment: 'Bullet', blitz_increment: 'Blitz', rapid_increment: 'Rapid',
    };
    return labels[key] || key;
  };

  if (!isAuthenticated || !user) return null;

  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-card border border-border rounded-lg shadow-lg p-6 md:p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Find a Match</h1>
              <p className="text-muted-foreground">Select a time control and start playing</p>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {error}
              </div>
            )}
            {!isInQueue ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Select Time Control
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(timeControls).map(([key, control]) => (
                      <button
                        key={key}
                        onClick={() => { if (!isInQueue) setSelectedTimeControl(key) }}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${selectedTimeControl === key
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-foreground">
                              {getTimeControlLabel(key)}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="w-4 h-4" />
                              {formatTimeControl(control as api.TimeControl)}
                            </div>
                          </div>
                          {selectedTimeControl === key && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleJoinQueue}
                  disabled={isLoading || !selectedTimeControl}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Find Game
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    Searching for opponent...
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Time control: <span className="font-medium">{getTimeControlLabel(selectedTimeControl)}</span>
                  </p>
                  <div className="text-3xl font-mono text-primary font-bold">
                    {formatTime(waitTime)}
                  </div>
                </div>
                <Button
                  onClick={handleLeaveQueue}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Leaving...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel Search
                    </>
                  )}
                </Button>
              </div>
            )}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Your Rating</span>
                <span className="font-semibold text-foreground">{user[ratingKey]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
export default Matchmaking;
