-- Chess Platform PostgreSQL Schema
-- Initial migration for the chess platform database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================
-- USERS TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    hall_of_residence VARCHAR(255) NOT NULL,
    is_online BOOLEAN DEFAULT FALSE,
    
    -- Rating fields
    bullet INTEGER DEFAULT 1200,
    blitz INTEGER DEFAULT 1200,
    rapid INTEGER DEFAULT 1200,
    puzzles INTEGER DEFAULT 1200,
    
    -- Stats
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_bullet ON users(bullet DESC);
CREATE INDEX IF NOT EXISTS idx_users_blitz ON users(blitz DESC);
CREATE INDEX IF NOT EXISTS idx_users_rapid ON users(rapid DESC);

-- ===============================
-- GAME HISTORY TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS game_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    game_id VARCHAR(255) NOT NULL,
    opponent_user_id VARCHAR(255) NOT NULL,
    opponent_username VARCHAR(100) NOT NULL,
    result VARCHAR(10) NOT NULL CHECK (result IN ('won', 'lost', 'draw')),
    rating_change INTEGER NOT NULL DEFAULT 0,
    time_control VARCHAR(50) NOT NULL,
    termination VARCHAR(100) NOT NULL,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Store the final FEN position (optional but useful for review)
    final_fen TEXT,
    
    -- Store move history as JSON array
    moves JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for game history
CREATE INDEX IF NOT EXISTS idx_game_history_user_id ON game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history(game_id);
CREATE INDEX IF NOT EXISTS idx_game_history_played_at ON game_history(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_time_control ON game_history(time_control);

-- ===============================
-- COMPUTER GAMES TABLE
-- For tracking games against Stockfish
-- ===============================
CREATE TABLE IF NOT EXISTS computer_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    game_id VARCHAR(255) UNIQUE NOT NULL,
    stockfish_level INTEGER NOT NULL CHECK (stockfish_level >= 1 AND stockfish_level <= 20),
    stockfish_elo INTEGER NOT NULL,
    user_color VARCHAR(5) NOT NULL CHECK (user_color IN ('white', 'black')),
    result VARCHAR(10) CHECK (result IN ('won', 'lost', 'draw', NULL)),
    time_control VARCHAR(50) NOT NULL,
    final_fen TEXT,
    moves JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_computer_games_user_id ON computer_games(user_id);
CREATE INDEX IF NOT EXISTS idx_computer_games_game_id ON computer_games(game_id);

-- ===============================
-- FUNCTIONS
-- ===============================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- VIEWS
-- ===============================

-- Leaderboard view for each time control
CREATE OR REPLACE VIEW leaderboard_bullet AS
SELECT user_id, username, bullet as rating, games_played, games_won
FROM users
WHERE games_played > 0
ORDER BY bullet DESC;

CREATE OR REPLACE VIEW leaderboard_blitz AS
SELECT user_id, username, blitz as rating, games_played, games_won
FROM users
WHERE games_played > 0
ORDER BY blitz DESC;

CREATE OR REPLACE VIEW leaderboard_rapid AS
SELECT user_id, username, rapid as rating, games_played, games_won
FROM users
WHERE games_played > 0
ORDER BY rapid DESC;

-- ===============================
-- SAMPLE DATA (Optional - remove in production)
-- ===============================
-- This section is commented out by default
-- Uncomment if you want test data

-- INSERT INTO users (user_id, username, email, password, hall_of_residence, bullet, blitz, rapid)
-- VALUES 
--     ('test-user-1', 'ChessMaster', 'master@test.com', '$2a$10$...', 'Hall A', 1500, 1450, 1400),
--     ('test-user-2', 'GrandMaster', 'gm@test.com', '$2a$10$...', 'Hall B', 1800, 1750, 1700);

COMMENT ON TABLE users IS 'User accounts with ratings for different time controls';
COMMENT ON TABLE game_history IS 'History of completed games between players';
COMMENT ON TABLE computer_games IS 'History of games against Stockfish computer';
