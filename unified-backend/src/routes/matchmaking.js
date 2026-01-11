const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const MatchmakingService = require('../services/matchmaking-service');
const { redis } = require('../lib/db'); // Needed for status check helpers if not in service

router.get('/time-controls', (req, res) => {
    res.json(MatchmakingService.TIME_CONTROLS);
});

router.post('/join', requireAuth, async (req, res) => {
    try {
        const { userId, timeControl, rating } = req.body;
        if (req.user.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
        if (!MatchmakingService.TIME_CONTROLS[timeControl]) return res.status(400).json({ error: 'Invalid config' });

        const result = await MatchmakingService.addToQueue(userId, rating, timeControl);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Join failed' });
    }
});

router.post('/leave', requireAuth, async (req, res) => {
    try {
        const { userId } = req.body;
        if (req.user.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        await MatchmakingService.removeFromQueue(userId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Leave failed' });
    }
});

router.get('/status/:userId', requireAuth, async (req, res) => {
    const { userId } = req.params;
    if (req.user.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    // This logic is slightly duplicated from original index.js but acceptable
    const entry = await redis.hgetall(`entry:${userId}`);
    if (entry?.timeControl) {
        return res.json({
            inQueue: true,
            timeControl: entry.timeControl,
            rating: Number(entry.rating),
            joinedAt: Number(entry.joinedAt),
            hasGame: false,
            gameId: null,
        });
    }

    const gameId = await redis.get(`activeGame:${userId}`);
    res.json({
        inQueue: false,
        hasGame: !!gameId,
        gameId: gameId || null,
    });
});

// Polling endpoint (DEPRECATED: Clients should listen to socket match_found)
router.get('/game/:userId', requireAuth, async (req, res) => {
    const { userId } = req.params;
    if (req.user.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const gameId = await redis.get(`activeGame:${userId}`);
    if (!gameId) return res.status(404).json({ error: 'No active game' });
    res.json({ gameId });
});

module.exports = router;
