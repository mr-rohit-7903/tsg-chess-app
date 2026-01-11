const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const GameService = require('../services/game-service');

// Manual Create (Internal/Debug)
router.post('/', async (req, res) => {
    try {
        // Only used by internal matchmaking usually
        const gameState = await GameService.createGame(req.body);
        res.status(201).json({ gameId: gameState.gameId, initialState: gameState });
    } catch (err) {
        res.status(500).json({ error: 'Create failed' });
    }
});

// Get Game State (snapshot)
router.get('/live/:gameId', requireAuth, async (req, res) => {
    try {
        const gameState = await GameService.getGameState(req.params.gameId);
        if (!gameState) return res.status(404).json({ error: 'Game not found' });
        res.json(gameState);
    } catch (err) {
        res.status(500).json({ error: 'Fetch failed' });
    }
});

// Move (Deprecated / Fallback)
router.post('/:gameId/move', requireAuth, async (req, res) => {
    try {
        const { playerId, move } = req.body;
        const result = await GameService.handlePlayerMove(req.params.gameId, playerId, move);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Move failed' });
    }
});

// Resign
router.post('/:gameId/resign', requireAuth, async (req, res) => {
    try {
        const { gameId } = req.params;
        const result = await GameService.resignGame(gameId, req.user.userId);
        if (result.error) return res.status(400).json(result);

        // Emit game over event immediately via socket service (optional, as handleGameOver might do it via redis pub/sub or direct call?)
        // handleGameOver updates redis state. 
        // We need to notify clients. 
        // In this architecture, handleGameOver emits via socket? 
        // Let's check socket-service listeners or if handleGameOver needs to emit.
        // Current handleGameOver does NOT seem to emit to socket directly in the service file I viewed earlier.
        // Wait, handleGameOver in game-service.js is pure logic + redis. 
        // It does NOT import `io`.
        // We need to emit the event here in the controller or make game-service emit.
        // Let's emit here for simplicity.
        const { getIO } = require('../services/socket-service');
        try {
            const io = getIO();
            io.to(gameId).emit('game_over', result.outcome);
        } catch (e) { console.error('Socket emit failed', e); }

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Resign failed' });
    }
});

router.post('/:gameId/timeout', requireAuth, async (req, res) => {
    try {
        const { gameId } = req.params;
        const result = await GameService.claimTimeout(gameId, req.user.userId);
        if (result.error) return res.status(400).json(result);

        const { getIO } = require('../services/socket-service');
        try {
            const io = getIO();
            io.to(gameId).emit('game_over', result.outcome);
        } catch (e) { console.error('Socket emit failed', e); }

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Claim timeout failed' });
    }
});

module.exports = router;
