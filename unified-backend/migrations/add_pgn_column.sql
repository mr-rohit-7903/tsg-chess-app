-- Add PGN column to game_history table
-- This migration adds the pgn column to store PGN notation for games

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'game_history' 
        AND column_name = 'pgn'
    ) THEN
        ALTER TABLE game_history ADD COLUMN pgn TEXT;
    END IF;
END $$;
