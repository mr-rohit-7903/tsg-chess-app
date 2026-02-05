-- Friends & Friendly Challenge System Migration
-- This migration adds tables for the friends system and friendly game challenges

-- ===============================
-- FRIENDS TABLE
-- Stores bidirectional friendships between users
-- ===============================
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    friend_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);

-- ===============================
-- FRIEND REQUESTS TABLE
-- Tracks pending, accepted, and declined friend requests
-- ===============================
CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- ===============================
-- FRIENDLY CHALLENGES TABLE
-- Tracks game challenges between friends
-- ===============================
CREATE TABLE IF NOT EXISTS friendly_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenger_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    challenged_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    time_control_key VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    game_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '5 minutes'
);

CREATE INDEX IF NOT EXISTS idx_friendly_challenges_challenger_id ON friendly_challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_friendly_challenges_challenged_id ON friendly_challenges(challenged_id);
CREATE INDEX IF NOT EXISTS idx_friendly_challenges_status ON friendly_challenges(status);

-- ===============================
-- UPDATE GAME HISTORY TABLE
-- Add is_friendly column to track friendly games
-- ===============================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'is_friendly'
    ) THEN
        ALTER TABLE game_history ADD COLUMN is_friendly BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_game_history_is_friendly ON game_history(is_friendly);

-- ===============================
-- TRIGGERS
-- ===============================

-- Trigger for friend_requests updated_at
DROP TRIGGER IF EXISTS update_friend_requests_updated_at ON friend_requests;
CREATE TRIGGER update_friend_requests_updated_at
    BEFORE UPDATE ON friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================
-- COMMENTS
-- ===============================
COMMENT ON TABLE friends IS 'Bidirectional friendships between users';
COMMENT ON TABLE friend_requests IS 'Friend request history with status tracking';
COMMENT ON TABLE friendly_challenges IS 'Game challenges between friends that do not affect ratings';
