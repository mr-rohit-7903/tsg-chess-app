/**
 * Game History Repository - PostgreSQL implementation
 */

const { query } = require('../lib/db');

class GameHistoryRepository {
    /**
     * Add game to history for a player
     */
    static async addGameToHistory({
        userId,
        gameId,
        opponentUserId,
        opponentUsername,
        result, // 'won', 'lost', 'draw'
        ratingChange,
        timeControl,
        termination,
        finalFen,
        moves,
        pgn,
    }) {
        const result_ = await query(
            `INSERT INTO game_history 
             (user_id, game_id, opponent_user_id, opponent_username, result, rating_change, time_control, termination, final_fen, moves, pgn)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [userId, gameId, opponentUserId, opponentUsername, result, ratingChange, timeControl, termination, finalFen, JSON.stringify(moves || []), pgn]
        );
        return this._toCamelCase(result_.rows[0]);
    }

    /**
     * Get game history for a user
     */
    static async getGameHistory(userId, limit = 50) {
        const result = await query(
            `SELECT * FROM game_history 
             WHERE user_id = $1 
             ORDER BY played_at DESC 
             LIMIT $2`,
            [userId, limit]
        );
        return result.rows.map(this._toCamelCase);
    }

    /**
     * Get a specific game by gameId
     */
    static async getGameById(gameId) {
        const result = await query(
            `SELECT * FROM game_history WHERE game_id = $1`,
            [gameId]
        );
        return result.rows.map(this._toCamelCase);
    }

    static _toCamelCase(row) {
        if (!row) return null;
        return {
            id: row.id,
            gameId: row.game_id,
            opponentUserId: row.opponent_user_id,
            opponentUsername: row.opponent_username,
            result: row.result,
            ratingChange: row.rating_change,
            timeControl: row.time_control,
            termination: row.termination,
            playedAt: row.played_at,
            finalFen: row.final_fen,
            moves: row.moves,
            pgn: row.pgn,
        };
    }
}

module.exports = GameHistoryRepository;
