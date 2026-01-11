const mongoose = require('mongoose');
const Redis = require('ioredis');

// --- Mongo ---
const connectMongo = async () => {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chess-platform';

    // Mask password for logging
    const maskedURI = MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
    console.log(`Trying to connect to MongoDB at: ${maskedURI}`);

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000 // Fail faster if IP is blocked
        });
        console.log('✅ Connected to MongoDB (unified backend)');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        if (err.message.includes('buffering timed out') || err.message.includes('MongooseServerSelectionError')) {
            console.error('HINT: Check your MongoDB Atlas IP Whitelist. Your current IP might be blocked.');
        }
        process.exit(1);
    }
};

// --- Redis ---
const redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, { family: 4 })
    : new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: Number(process.env.REDIS_PORT || 6379),
        family: 4,
    });

redis.on('connect', () => console.log('✅ Connected to Redis (unified backend)'));
redis.on('error', (err) => console.error('Redis error', err));

module.exports = { connectMongo, redis };
