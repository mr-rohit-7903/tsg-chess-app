const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const redis = require('../lib/db').redis;

let io;

const initSocket = (server, allowedOrigins) => {
    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    // Auth Middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next({ message: 'Authentication failed', data: { code: 'AUTH_MISSING' } });
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (error) {
            next({ message: 'Authentication failed', data: { code: 'AUTH_INVALID' } });
        }
    });

    io.on('connection', async (socket) => {
        const userId = socket.user?.userId;
        if (!userId) {
            socket.disconnect(true);
            return;
        }

        console.log(`[Socket] User ${userId} connected (Socket ID: ${socket.id})`);

        // Join personal room for targeted events (like matchmaking success)
        socket.join(userId);

        // Clear any disconnect flags
        await redis.del(`player:disconnected:${userId}`);

        socket.on('join_game', async (gameId) => {
            // Basic validation handled in Game Service or here? 
            // For now, minimal validation to allow socket to join room
            socket.join(gameId);
            console.log(`[Socket] User ${userId} joined game room: ${gameId}`);
            // Emitting initial state should trigger from client request or separate event
        });

        socket.on('move', async (payload) => {
            const { gameId, move } = payload || {};
            if (!gameId || !move) return;

            const { handlePlayerMove } = require('./game-service'); // Lazy load to avoid circular dep if any? 
            // Actually game-service imports socket flow? No, game-service is clean.
            // But let's require at top level if possible, or here.
            // game-service.js doesn't import socket-service.js. 
            // matchmaking-service imports socket-service.
            // So importing game-service here is safe.

            const result = await handlePlayerMove(gameId, userId, move);
            if (result?.newState) {
                io.to(gameId).emit('move_applied', { gameId, state: result.newState });
                io.to(gameId).emit('game_state', result.newState);
            }
            if (result?.gameOver) {
                io.to(gameId).emit('game_over', result.outcome);
            }
        });

        socket.on('disconnect', async (reason) => {
            console.log(`[Socket] User ${userId} disconnected. Reason: ${reason}`);
            await redis.set(`player:disconnected:${userId}`, Date.now());
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized!');
    }
    return io;
};

const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(userId).emit(event, data);
    }
};

const emitToRoom = (room, event, data) => {
    if (io) {
        io.to(room).emit(event, data);
    }
};

module.exports = { initSocket, getIO, emitToUser, emitToRoom };
