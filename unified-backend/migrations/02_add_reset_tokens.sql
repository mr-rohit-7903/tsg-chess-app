-- Add password reset token columns to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
    ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE;

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token);
