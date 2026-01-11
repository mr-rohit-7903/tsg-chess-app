const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { timeControl = 'blitz' } = req.query;
        const user = await User.findOne({ userId });

        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user[timeControl] === undefined) return res.status(400).json({ error: 'Invalid key' });

        res.json({
            userId,
            timeControl,
            rating: user[timeControl],
            gamesPlayed: user.gamesPlayed
        });
    } catch (err) {
        res.status(500).json({ error: 'Error' });
    }
});

// Update (Deprecated - logic now in GameService)
// Kept for manual triggers if needed
router.post('/update', async (req, res) => {
    // Just return success dummy to break dependency if external services call this
    console.log('Dummy /ratings/update endpoint called');
    res.json({ status: 'Handled internally by GameService now' });
});

module.exports = router;
