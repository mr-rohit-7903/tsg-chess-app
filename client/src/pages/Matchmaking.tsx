import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from '@/context/SocketContext';
import * as api from '@/lib/api';
import { Clock, Search, X, Loader2 } from 'lucide-react';

const Matchmaking = () => {
  type RatingKey = 'bullet' | 'blitz' | 'rapid';
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

  const [latestRating, setLatestRating] = useState<number | null>(null);

  const ratingKey = useMemo(() => (selectedTimeControl || 'blitz') as RatingKey, [selectedTimeControl]);

  // Fetch latest rating when ratingKey changes
  useEffect(() => {
    if (!user?.userId) return;
    
    let active = true;
    setLatestRating(null); // Reset while loading to fall back to cached

    api.getUserRating(user.userId, ratingKey)
      .then(data => {
        if (active && isMounted.current) {
          setLatestRating(data.rating); // Assuming API returns { rating: number, ... }
        }
      })
      .catch(err => {
        console.error('Failed to fetch rating:', err);
      });
      
    return () => { active = false; };
  }, [user?.userId, ratingKey]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  // Fetch time controls on mount
  useEffect(() => {
    const fetchTimeControls = async () => {
      try {
        const controls = await api.getTimeControls();
        if (isMounted.current) {
          setTimeControls(controls);
          const firstKey = Object.keys(controls)[0];
          if (firstKey && !selectedTimeControl) setSelectedTimeControl(firstKey);
        }
      } catch {
        // Retry after 2s
        setTimeout(fetchTimeControls, 2000);
      }
    };
    fetchTimeControls();
  }, [selectedTimeControl]);

  // Check for existing game on mount
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const checkExistingGame = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        const status = await api.getMatchmakingStatus(user.userId, token);
        if (status.hasGame && status.gameId) {
          navigate(`/game/${status.gameId}`);
        } else if (status.inQueue) {
          setIsInQueue(true);
          setActiveQueueType(status.timeControl || null);
          setJoinedAt(status.joinedAt || Date.now());
          hasJoinedQueue.current = true;
        }
      } catch {
        // Ignore
      }
    };
    
    checkExistingGame();
  }, [isAuthenticated, user, navigate]);

  // Socket Listener for Match Found
  useEffect(() => {
    if (!socket) {
      console.log('[Matchmaking] No socket available');
      return;
    }

    console.log('[Matchmaking] Setting up match_found listener, connected:', socket.connected);

    const onMatchFound = (data: { gameId: string }) => {
      console.log('[Matchmaking] Match found!', data);
      setIsInQueue(false);
      setIsLoading(false);
      hasJoinedQueue.current = false;
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
    if (!user || !selectedTimeControl || hasJoinedQueue.current) return;
    
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
      setIsInQueue(false);
      setJoinedAt(null);
    } finally {
      setIsLoading(false);
    }
  };

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
    };
    return labels[key] || key;
  };

  if (!isAuthenticated || !user) return null;

  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-xl">
          <div className="bg-card border border-border rounded-lg shadow-lg p-6 md:p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Play Chess</h1>
              <p className="text-muted-foreground">
                {isConnected ? '🟢 Connected' : '🔴 Connecting...'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                {error}
              </div>
            )}

            {!isInQueue ? (
              <div className="space-y-6">
                {/* Time Control Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Select Time Control
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(timeControls).map(([key, control]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedTimeControl(key)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedTimeControl === key
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

                {/* Action Button */}
                <Button
                  onClick={handleJoinQueue}
                  disabled={isLoading || !selectedTimeControl || !isConnected}
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
                      Find Opponent
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
                <span>Your Rating ({getTimeControlLabel(ratingKey)})</span>
                <span className="font-semibold text-foreground">
                  {latestRating !== null ? latestRating : user[ratingKey]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Matchmaking;
