const express = require('express');
const router = express.Router();
const ChallengeService = require('../services/challenge-service');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

// Send challenge
router.post('/', async (req, res) => {
    try {
        const { challengedId, timeControlKey } = req.body;
        if (!challengedId || !timeControlKey) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const challenge = await ChallengeService.sendChallenge(
            req.user.userId,
            challengedId,
            timeControlKey
        );
        res.status(201).json(challenge);
    } catch (error) {
        console.error('Error sending challenge:', error);
        res.status(400).json({ error: error.message || 'Failed to send challenge' });
    }
});

// Get pending challenges (received)
router.get('/', async (req, res) => {
    try {
        const challenges = await ChallengeService.getPendingChallenges(req.user.userId);
        res.json(challenges);
    } catch (error) {
        console.error('Error getting challenges:', error);
        res.status(500).json({ error: 'Failed to get challenges' });
    }
});

// Accept challenge
router.post('/:id/accept', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await ChallengeService.acceptChallenge(id, req.user.userId);
        res.json(result);
    } catch (error) {
        console.error('Error accepting challenge:', error);
        res.status(400).json({ error: error.message || 'Failed to accept challenge' });
    }
});

// Decline challenge
router.post('/:id/decline', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await ChallengeService.declineChallenge(id, req.user.userId);
        res.json(result);
    } catch (error) {
        console.error('Error declining challenge:', error);
        res.status(400).json({ error: error.message || 'Failed to decline challenge' });
    }
});

module.exports = router;
