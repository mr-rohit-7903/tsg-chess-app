require('dotenv').config();
const { redis } = require('../src/lib/db');

async function clearActiveGames() {
    console.log('Connecting to Redis...');
    // accessing redis directly might require waiting for the event if the module exports an instance that connects asyncly
    // but ioRedis usually connects immediately or buffers.

    try {
        const keys = await redis.keys('activeGame:*');
        console.log(`Found ${keys.length} active game locks.`);
        if (keys.length > 0) {
            await redis.del(...keys);
            console.log('Deleted active game locks.');
        }

        const playerStates = await redis.keys('player:state:*');
        if (playerStates.length > 0) {
            await redis.del(...playerStates);
            console.log('Deleted player states.');
        }

        const activeGamesSet = await redis.smembers('active_games');
        if (activeGamesSet.length > 0) {
            // Optional: delete the game data itself? Maybe keep for history.
            // But remove from active_games set
            await redis.del('active_games');
            console.log('Cleared active_games set.');
        }

        console.log('Cleanup complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error clearing redis:', err);
        process.exit(1);
    }
}

clearActiveGames();
