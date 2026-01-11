const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/', async (req, res) => {
    try {
        const { limit = 10, timeControl = 'blitz' } = req.query;
        if (!['bullet', 'blitz', 'rapid', 'puzzles'].includes(timeControl)) {
            return res.status(400).json({ error: 'Invalid timeControl' });
        }

        const sortCriteria = {};
        sortCriteria[timeControl] = -1;

        const users = await User.find({}, { password: 0 })
            .sort(sortCriteria)
            .limit(Number(limit));

        const leaderboard = users.map(u => ({
            userId: u.userId,
            username: u.username,
            rating: u[timeControl],
            gamesPlayed: u.gamesPlayed,
            timeControl
        }));

        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
