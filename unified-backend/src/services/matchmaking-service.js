const { redis } = require('../lib/db');
const { createGame } = require('./game-service');
const { emitToUser } = require('./socket-service');

const TIME_CONTROLS = {
    bullet: { initialMs: 60000, incrementMs: 0 },
    blitz: { initialMs: 300000, incrementMs: 0 },
    rapid: { initialMs: 600000, incrementMs: 0 },
};

let isRunning = false;

async function addToQueue(userId, rating, timeControl) {
    const stateKey = `player:state:${userId}`;
    const state = await redis.get(stateKey);

    // if (state === 'IN_GAME') return { status: 'in_game' }; // Disabled for debugging stuck states

    await redis
        .multi()
        .set(stateKey, 'QUEUED')
        .hset(`entry:${userId}`, 'userId', userId, 'rating', rating, 'timeControl', timeControl, 'joinedAt', Date.now())
        .zadd(`queue:${timeControl}`, rating, userId)
        .sadd('queued_users', userId)
        .expire(`entry:${userId}`, 120) // TTL
        .expire(stateKey, 120)
        .exec();

    return { status: 'queued' };
}

async function removeFromQueue(userId) {
    const entry = await redis.hgetall(`entry:${userId}`);
    if (entry?.timeControl) {
        await redis
            .multi()
            .zrem(`queue:${entry.timeControl}`, userId)
            .del(`entry:${userId}`)
            .del(`player:state:${userId}`)
            .srem('queued_users', userId)
            .exec();
    }
}

async function matchmakingLoop() {
    if (isRunning) return;
    isRunning = true;

    try {
        for (const timeControl of Object.keys(TIME_CONTROLS)) {
            const users = await redis.zrange(`queue:${timeControl}`, 0, -1);
            
            // 1. Filter and Expire Users
            const validUsers = [];
            
            for (const userId of users) {
                const entry = await redis.hgetall(`entry:${userId}`);
                
                // Check if entry exists and checks for expiry (2 minutes)
                if (!entry || !entry.joinedAt) {
                    // Stale queue entry (key expired or missing), clean it up
                    await redis.zrem(`queue:${timeControl}`, userId);
                    await redis.srem('queued_users', userId);
                    continue;
                }

                const joinedAt = parseInt(entry.joinedAt);
                const timeInQueue = Date.now() - joinedAt;

                if (timeInQueue > 120000) { // 2 minutes
                    try {
                        console.log(`[Matchmaking] User ${userId} request expired after ${timeInQueue}ms`);
                        await removeFromQueue(userId);
                        emitToUser(userId, 'matchmaking_expired', { 
                            message: 'Cannot find a match. Please try again.' 
                        });
                    } catch (e) {
                         console.error(`[Matchmaking] Error expiring user ${userId}`, e);
                    }
                    continue;
                }

                validUsers.push(userId);
            }

            // 2. Process pairs from valid users
            if (validUsers.length < 2) continue;

            while (validUsers.length >= 2) {
                const userA = validUsers.shift();
                const userB = validUsers.shift();

                const whiteId = Math.random() > 0.5 ? userA : userB;
                const blackId = whiteId === userA ? userB : userA;

                try {
                    const gameState = await createGame({
                        whitePlayerId: whiteId,
                        blackPlayerId: blackId,
                        timeControl: TIME_CONTROLS[timeControl],
                        timeControlKey: timeControl
                    });

                    // cleanup queue
                    await Promise.all([removeFromQueue(userA), removeFromQueue(userB)]);

                    await redis.set(`player:state:${userA}`, 'IN_GAME');
                    await redis.set(`player:state:${userB}`, 'IN_GAME');

                    console.log(`[Matchmaking] Match found: ${userA} vs ${userB}`);
                    emitToUser(userA, 'match_found', { gameId: gameState.gameId });
                    emitToUser(userB, 'match_found', { gameId: gameState.gameId });

                } catch (err) {
                    console.error('Matchmaking error for pair:', err);
                    // If game creation fails, we might want to unshift them back or let them retry next loop
                    // For now, they are consumed from validUsers but 'removeFromQueue' wasn't called if error happened before it?
                    // Actually removeFromQueue is called inside try block. If createGame fails, they are stuck in queue for next loop?
                    // Yes, validUsers is local. Queue in Redis is untouched until removeFromQueue.
                }
            }
        }
    } catch (err) {
        console.error('Matchmaking loop error:', err);
    } finally {
        isRunning = false;
    }
}

setInterval(matchmakingLoop, 1000);

module.exports = {
    addToQueue,
    removeFromQueue,
    TIME_CONTROLS
};
