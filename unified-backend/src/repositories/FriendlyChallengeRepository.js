const { query } = require('../lib/db');

class FriendlyChallengeRepository {
    /**
     * Create a new challenge
     */
    static async createChallenge(challengerId, challengedId, timeControlKey) {
        const result = await query(
            `INSERT INTO friendly_challenges (challenger_id, challenged_id, time_control_key, status)
             VALUES ($1, $2, $3, 'pending')
             RETURNING *`,
            [challengerId, challengedId, timeControlKey]
        );
        return this._toCamelCase(result.rows[0]);
    }

    /**
     * Get challenge by ID
     */
    static async getChallengeById(challengeId) {
        const result = await query(
            `SELECT fc.*, 
                    u1.username as challenger_username,
                    u2.username as challenged_username
             FROM friendly_challenges fc
             JOIN users u1 ON fc.challenger_id = u1.user_id
             JOIN users u2 ON fc.challenged_id = u2.user_id
             WHERE fc.id = $1`,
            [challengeId]
        );
        if (!result.rows[0]) return null;
        return {
            ...this._toCamelCase(result.rows[0]),
            challengerUsername: result.rows[0].challenger_username,
            challengedUsername: result.rows[0].challenged_username,
        };
    }

    /**
     * Get pending challenges for a user (received)
     */
    static async getPendingChallenges(userId) {
        const result = await query(
            `SELECT fc.*, u.username as challenger_username
             FROM friendly_challenges fc
             JOIN users u ON fc.challenger_id = u.user_id
             WHERE fc.challenged_id = $1 
             AND fc.status = 'pending'
             AND fc.expires_at > NOW()
             ORDER BY fc.created_at DESC`,
            [userId]
        );
        return result.rows.map(row => ({
            ...this._toCamelCase(row),
            challengerUsername: row.challenger_username,
        }));
    }

    /**
     * Get sent challenges by a user
     */
    static async getSentChallenges(userId) {
        const result = await query(
            `SELECT fc.*, u.username as challenged_username
             FROM friendly_challenges fc
             JOIN users u ON fc.challenged_id = u.user_id
             WHERE fc.challenger_id = $1 
             AND fc.status = 'pending'
             AND fc.expires_at > NOW()
             ORDER BY fc.created_at DESC`,
            [userId]
        );
        return result.rows.map(row => ({
            ...this._toCamelCase(row),
            challengedUsername: row.challenged_username,
        }));
    }

    /**
     * Update challenge status
     */
    static async updateStatus(challengeId, status, gameId = null) {
        const result = await query(
            `UPDATE friendly_challenges 
             SET status = $2, game_id = COALESCE($3, game_id)
             WHERE id = $1
             RETURNING *`,
            [challengeId, status, gameId]
        );
        return result.rows[0] ? this._toCamelCase(result.rows[0]) : null;
    }

    /**
     * Expire old pending challenges
     */
    static async expireOldChallenges() {
        await query(
            `UPDATE friendly_challenges 
             SET status = 'expired'
             WHERE status = 'pending' AND expires_at < NOW()`
        );
    }

    /**
     * Check if there's already a pending challenge between two users
     */
    static async hasPendingChallenge(userId1, userId2) {
        const result = await query(
            `SELECT 1 FROM friendly_challenges 
             WHERE status = 'pending' 
             AND expires_at > NOW()
             AND (
                 (challenger_id = $1 AND challenged_id = $2) OR
                 (challenger_id = $2 AND challenged_id = $1)
             )`,
            [userId1, userId2]
        );
        return result.rows.length > 0;
    }

    static _toCamelCase(row) {
        if (!row) return null;
        return {
            id: row.id,
            challengerId: row.challenger_id,
            challengedId: row.challenged_id,
            timeControlKey: row.time_control_key,
            status: row.status,
            gameId: row.game_id,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
        };
    }
}

module.exports = FriendlyChallengeRepository;
