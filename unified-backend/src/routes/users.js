const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// Get Profile
router.get('/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId }, '-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error with user fetching' });
    }
});

// Update Profile
router.put('/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        if (req.user.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const updates = req.body;
        ['email', 'isOnline'].forEach(f => {
            if (updates[f] !== undefined) user[f] = updates[f];
        });

        await user.save();
        const { password: _, ...response } = user.toObject();
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// Get Games
router.get('/:userId/games', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        // Allow viewing other users' games? Original code enforced owner check.
        // "if (req.user.userId !== userId) ..."
        // Let's keep it strict for now per original.
        if (req.user.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

        const user = await User.findOne({ userId }, 'gameHistory');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user.gameHistory || []);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
