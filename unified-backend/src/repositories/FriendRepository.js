const { query } = require('../lib/db');

class FriendRepository {
    /**
     * Add a bidirectional friendship
     */
    static async addFriend(userId, friendId) {
        // Add both directions of the friendship
        await query(
            `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)
             ON CONFLICT (user_id, friend_id) DO NOTHING`,
            [userId, friendId]
        );
    }

    /**
     * Remove a friendship (both directions)
     */
    static async removeFriend(userId, friendId) {
        await query(
            `DELETE FROM friends WHERE 
             (user_id = $1 AND friend_id = $2) OR 
             (user_id = $2 AND friend_id = $1)`,
            [userId, friendId]
        );
    }

    /**
     * Check if two users are friends
     */
    static async areFriends(userId, friendId) {
        const result = await query(
            `SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2`,
            [userId, friendId]
        );
        return result.rows.length > 0;
    }

    /**
     * Get user's friends list with user details
     */
    static async getFriends(userId) {
        const result = await query(
            `SELECT u.user_id, u.username, u.is_online, u.bullet, u.blitz, u.rapid
             FROM friends f
             JOIN users u ON f.friend_id = u.user_id
             WHERE f.user_id = $1
             ORDER BY u.username`,
            [userId]
        );
        return result.rows.map(row => ({
            userId: row.user_id,
            username: row.username,
            isOnline: row.is_online,
            ratings: {
                bullet: row.bullet,
                blitz: row.blitz,
                rapid: row.rapid,
            }
        }));
    }

    /**
     * Get friend count for a user
     */
    static async getFriendCount(userId) {
        const result = await query(
            `SELECT COUNT(*) as count FROM friends WHERE user_id = $1`,
            [userId]
        );
        return parseInt(result.rows[0].count, 10);
    }
}

module.exports = FriendRepository;
