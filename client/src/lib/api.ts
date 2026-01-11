// API Base URL from environment variable
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export type GameHistoryEntry = {
  gameId: string;
  opponentUserId: string;
  opponentUsername: string;
  result: 'won' | 'lost' | 'draw';
  ratingChange: number;
  timeControl: string;
  termination: string;
  playedAt: string;
};

export type User = {
  userId: string;
  username: string;
  fullName?: string;
  email: string;
  hallOfResidence: string;
  bullet: number;
  blitz: number;
  rapid: number;
  puzzles: number;
  gamesPlayed: number;
  gamesWon: number;
  createdAt: string;
  isOnline: boolean;
  gameHistory: GameHistoryEntry[];
  currentStreak?: number;
  campusRank?: number;
};

export interface PlayerInfo {
  name: string;
  rating: number;
  won?: boolean;
}

export interface GameEntry {
  timeControl: string;
  modeIcon: Mode;
  white: PlayerInfo;
  black: PlayerInfo;
  result: "Won" | "Lost" | "Draw";
  date: string;
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data as { message: string; user: User; token: string };
}

export async function register(username: string, fullName: string, email: string, password: string, hallOfResidence: string) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, fullName, email, password, hallOfResidence }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data as { message: string; user: User; token: string };
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
}

export async function getUserById(userId: string, token: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get user');
  return data as User;
}

export async function updateUser(userId: string, updates: Partial<User>, token: string) {
  const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update user');
  return data as User;
}

export type Mode = "bullet" | "blitz" | "rapid" | "bot";

export type TimeControl = {
  initialMs: number;
  incrementMs: number;
};

export type TimeControls = {
  [key: string]: TimeControl;
};

export type MatchmakingStatus = {
  inQueue: boolean;
  timeControl?: string;
  rating?: number;
  waitTime?: number;
  hasGame?: boolean;
  gameId?: string | null;
  joinedAt?: number;
};

export async function getTimeControls(): Promise<TimeControls> {
  const res = await fetch(`${API_BASE_URL}/matchmaking/time-controls`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch time controls');
  return data;
}

export async function joinMatchmaking(token: string, userId: string, timeControl: string, rating: number) {
  const res = await fetch(`${API_BASE_URL}/matchmaking/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, timeControl, rating }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to join matchmaking');
  return data;
}

export async function leaveMatchmaking(userId: string, token: string) {
  const res = await fetch(`${API_BASE_URL}/matchmaking/leave`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to leave matchmaking');
  return data;
}

export async function getMatchmakingStatus(userId: string, token: string): Promise<MatchmakingStatus> {
  const res = await fetch(`${API_BASE_URL}/matchmaking/status/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get matchmaking status');
  return data;
}

export async function getGameIdForUser(token: string, userId: string): Promise<{ gameId: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/matchmaking/game/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (res.status === 404) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to get active game');
    return data;
  } catch {
    return null;
  }
}

export type GameState = {
  gameId: string;
  whitePlayerId: string;
  blackPlayerId: string;
  fen: string;
  whiteTimeLeftMs: number;
  blackTimeLeftMs: number;
  incrementMs: number;
  timeControl: {
    initialMs: number;
    incrementMs: number;
  };
  timeControlKey: string;
  createdAt: number;
  lastMoveTimestamp: number;
  gameStarted: boolean;
  moveHistory?: MoveHistoryEntry[];
};

export type MoveHistoryEntry = {
  from: string;
  to: string;
  san: string;
  promotion?: string;
  color: string;
  piece: string;
  captured?: string;
  timestamp: number;
};

export async function getGameState(token: string, gameId: string): Promise<GameState> {
  const res = await fetch(`${API_BASE_URL}/games/live/${gameId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get game state');
  return data as GameState;
}

export type Rating = {
  userId: string;
  timeControl: string;
  rating: number;
  ratingDeviation: number;
  volatility: number;
  gamesPlayed: number;
  lastUpdated: string;
};

export type RatingHistoryEntry = {
  rating: number;
  ratingDeviation: number;
  volatility: number;
  timestamp: string;
  timeControl: string;
};

export type LeaderboardEntry = {
  userId: string;
  username: string;
  rating: number;
  gamesPlayed: number;
  gamesWon: number;
};

export async function getUserRating(userId: string, timeControl?: string): Promise<Rating> {
  const url = new URL(`/ratings/${userId}`, API_BASE_URL);
  if (timeControl) url.searchParams.set('timeControl', timeControl);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch rating');
  return data;
}

export async function getRatingHistory(
  userId: string,
  timeControl?: string,
  limit = 100
): Promise<RatingHistoryEntry[]> {
  return [];
}

export async function getLeaderboard(
  timeControl: string,
  limit = 50
): Promise<LeaderboardEntry[]> {
  const url = new URL(`/leaderboard`, API_BASE_URL);
  url.searchParams.set('timeControl', timeControl);
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch leaderboard');
  return data;
}

export type Move = {
  from: string;
  to: string;
  promotion?: string;
};

export type MoveResult =
  | { success: true; newState: GameState }
  | { success: true; gameOver: true; outcome: { winner: string; reason: string } }
  | { success: false; error: string };

export async function makeMove(
  gameId: string,
  playerId: string,
  move: Move
): Promise<MoveResult> {
  const res = await fetch(`${API_BASE_URL}/games/${gameId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, move }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || 'Failed to make move' };
  }
  if (data.error) {
    return { success: false, error: data.error };
  }
  if (data.gameOver) {
    return {
      success: true,
      gameOver: true,
      outcome: data.outcome as { winner: string; reason: string },
    };
  }
  return { success: true, newState: data.newState as GameState };
}

export async function resignGame(gameId: string, token: string) {
  const res = await fetch(`${API_BASE_URL}/games/${gameId}/resign`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Resign failed');
  return data;
}

export async function claimTimeout(gameId: string, token: string) {
  const res = await fetch(`${API_BASE_URL}/games/${gameId}/timeout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Claim timeout failed');
  return data;
}

