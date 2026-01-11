require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function checkRatings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({}, 'username bullet blitz rapid gamesPlayed gamesWon gameHistory');

        console.log('\n--- User Ratings Dump ---');
        users.forEach(u => {
            console.log(`User: ${u.username}`);
            console.log(`  Rapid: ${u.rapid}`);
            console.log(`  Blitz: ${u.blitz}`);
            console.log(`  Bullet: ${u.bullet}`);
            console.log(`  Played: ${u.gamesPlayed}, Won: ${u.gamesWon}`);
            console.log(`  History Count: ${u.gameHistory.length}`);
            if (u.gameHistory.length > 0) {
                console.log(`  Last Game Result: ${u.gameHistory[0].result} (${u.gameHistory[0].ratingChange})`);
            }
            console.log('-------------------------');
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkRatings();
