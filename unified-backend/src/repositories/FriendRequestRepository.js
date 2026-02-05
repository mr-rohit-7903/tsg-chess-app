const { query } = require('../lib/db');

class FriendRequestRepository {
    /**
     * Create a friend request
     */
    static async createRequest(senderId, receiverId) {
        const result = await query(
            `INSERT INTO friend_requests (sender_id, receiver_id, status)
             VALUES ($1, $2, 'pending')
             ON CONFLICT (sender_id, receiver_id) 
             DO UPDATE SET status = 'pending', updated_at = NOW()
             RETURNING *`,
            [senderId, receiverId]
        );
        return this._toCamelCase(result.rows[0]);
    }

    /**
     * Get a specific request between two users
     */
    static async getRequest(senderId, receiverId) {
        const result = await query(
            `SELECT * FROM friend_requests 
             WHERE sender_id = $1 AND receiver_id = $2`,
            [senderId, receiverId]
        );
        return result.rows[0] ? this._toCamelCase(result.rows[0]) : null;
    }

    /**
     * Get request by ID
     */
    static async getRequestById(requestId) {
        const result = await query(
            `SELECT * FROM friend_requests WHERE id = $1`,
            [requestId]
        );
        return result.rows[0] ? this._toCamelCase(result.rows[0]) : null;
    }

    /**
     * Get pending requests received by a user
     */
    static async getPendingRequests(userId) {
        const result = await query(
            `SELECT fr.*, u.username as sender_username
             FROM friend_requests fr
             JOIN users u ON fr.sender_id = u.user_id
             WHERE fr.receiver_id = $1 AND fr.status = 'pending'
             ORDER BY fr.created_at DESC`,
            [userId]
        );
        return result.rows.map(row => ({
            id: row.id,
            senderId: row.sender_id,
            senderUsername: row.sender_username,
            receiverId: row.receiver_id,
            status: row.status,
            createdAt: row.created_at,
        }));
    }

    /**
     * Get sent requests by a user
     */
    static async getSentRequests(userId) {
        const result = await query(
            `SELECT fr.*, u.username as receiver_username
             FROM friend_requests fr
             JOIN users u ON fr.receiver_id = u.user_id
             WHERE fr.sender_id = $1 AND fr.status = 'pending'
             ORDER BY fr.created_at DESC`,
            [userId]
        );
        return result.rows.map(row => ({
            id: row.id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            receiverUsername: row.receiver_username,
            status: row.status,
            createdAt: row.created_at,
        }));
    }

    /**
     * Update request status
     */
    static async updateStatus(requestId, status) {
        const result = await query(
            `UPDATE friend_requests 
             SET status = $2, updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [requestId, status]
        );
        return result.rows[0] ? this._toCamelCase(result.rows[0]) : null;
    }

    /**
     * Check if a pending request exists (in either direction)
     */
    static async hasPendingRequest(userId1, userId2) {
        const result = await query(
            `SELECT 1 FROM friend_requests 
             WHERE status = 'pending' AND (
                 (sender_id = $1 AND receiver_id = $2) OR
                 (sender_id = $2 AND receiver_id = $1)
             )`,
            [userId1, userId2]
        );
        return result.rows.length > 0;
    }

    static _toCamelCase(row) {
        if (!row) return null;
        return {
            id: row.id,
            senderId: row.sender_id,
            receiverId: row.receiver_id,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

module.exports = FriendRequestRepository;
