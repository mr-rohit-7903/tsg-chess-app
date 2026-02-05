const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { redis } = require('../lib/db');
const UserRepository = require('../repositories/UserRepository');

let io;

const initSocket = (server, allowedOrigins) => {
    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
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
        const username = socket.user?.username;
        if (!userId) {
            socket.disconnect(true);
            return;
        }

        // Mark user as online in DB immediately
        try {
            await UserRepository.setOnline(userId, true);
        } catch (error) {
            console.error(`[Socket] Failed to mark user ${userId} online:`, error);
        }

        console.log(`[Socket] User ${userId} (${username}) connected (Socket ID: ${socket.id})`);

        // Join personal room for targeted events
        socket.join(userId);

        // Clear disconnect flags
        await redis.del(`player:disconnected:${userId}`);

        // ==========================================
        // GAME ROOM EVENTS
        // ==========================================

        socket.on('join_game', async (gameId) => {
            socket.join(gameId);
            console.log(`[Socket] User ${userId} joined game room: ${gameId}`);

            // Send current game state to the joining player
            const gameJSON = await redis.get(`game:${gameId}`);
            if (gameJSON) {
                const gameState = JSON.parse(gameJSON);
                socket.emit('game_state', gameState);
            }
        });

        socket.on('leave_game', (gameId) => {
            socket.leave(gameId);
            console.log(`[Socket] User ${userId} left game room: ${gameId}`);
        });

        // ==========================================
        // MOVE EVENTS
        // ==========================================

        socket.on('move', async (payload) => {
            const { gameId, move } = payload || {};
            if (!gameId || !move) return;

            const { handlePlayerMove } = require('./game-service');
            const result = await handlePlayerMove(gameId, userId, move);

            if (result.error) {
                // Send error back to the player who made the invalid move
                socket.emit('move_error', {
                    gameId,
                    error: result.error,
                    move
                });
                return;
            }

            if (result?.newState) {
                // Broadcast incremental move update to all players in the room
                io.to(gameId).emit('move_made', {
                    gameId,
                    move: result.move,
                    fen: result.newState.fen,
                    whiteTimeLeftMs: result.newState.whiteTimeLeftMs,
                    blackTimeLeftMs: result.newState.blackTimeLeftMs,
                    lastMoveTimestamp: result.newState.lastMoveTimestamp,
                    gameStarted: result.newState.gameStarted,
                });

                // Also send full state for backward compatibility
                io.to(gameId).emit('game_state', result.newState);
            }

            if (result?.gameOver) {
                io.to(gameId).emit('game_over', result.outcome);
            }
        });

        // ==========================================
        // CHAT EVENTS
        // ==========================================

        socket.on('chat_message', async (payload) => {
            const { gameId, message } = payload || {};
            if (!gameId || !message) return;

            // Validate message
            const trimmedMessage = String(message).trim().substring(0, 500); // Max 500 chars
            if (!trimmedMessage) return;

            // Check if user is in this game
            const gameJSON = await redis.get(`game:${gameId}`);
            if (!gameJSON) {
                socket.emit('chat_error', { error: 'Game not found' });
                return;
            }

            const gameState = JSON.parse(gameJSON);
            if (gameState.whitePlayerId !== userId && gameState.blackPlayerId !== userId) {
                socket.emit('chat_error', { error: 'Not a player in this game' });
                return;
            }

            const chatMessage = {
                id: `${Date.now()}-${userId.substring(0, 8)}`,
                gameId,
                userId,
                username: username || 'Anonymous',
                message: trimmedMessage,
                timestamp: Date.now(),
            };

            // Store in Redis with expiry (chat history for 1 hour after game)
            const chatKey = `chat:${gameId}`;
            await redis.rpush(chatKey, JSON.stringify(chatMessage));
            await redis.expire(chatKey, 3600); // 1 hour TTL

            // Broadcast to all players in the game room
            io.to(gameId).emit('chat_message', chatMessage);

            console.log(`[Chat] ${username} in game ${gameId}: ${trimmedMessage.substring(0, 50)}...`);
        });

        // Get chat history when joining a game
        socket.on('get_chat_history', async (gameId) => {
            if (!gameId) return;

            const chatKey = `chat:${gameId}`;
            const messages = await redis.lrange(chatKey, 0, -1);

            const chatHistory = messages.map(m => {
                try {
                    return JSON.parse(m);
                } catch {
                    return null;
                }
            }).filter(Boolean);

            socket.emit('chat_history', { gameId, messages: chatHistory });
        });

        // ==========================================
        // TYPING INDICATOR (optional but nice)
        // ==========================================

        socket.on('typing_start', (gameId) => {
            if (!gameId) return;
            socket.to(gameId).emit('opponent_typing', { userId, username, isTyping: true });
        });

        socket.on('typing_stop', (gameId) => {
            if (!gameId) return;
            socket.to(gameId).emit('opponent_typing', { userId, username, isTyping: false });
        });

        // ==========================================
        // DRAW OFFER EVENTS
        // ==========================================

        socket.on('offer_draw', async (gameId) => {
            if (!gameId) return;

            const gameJSON = await redis.get(`game:${gameId}`);
            if (!gameJSON) return;

            const gameState = JSON.parse(gameJSON);
            if (gameState.whitePlayerId !== userId && gameState.blackPlayerId !== userId) {
                return;
            }

            // Store draw offer in Redis
            await redis.set(`draw_offer:${gameId}:${userId}`, '1', 'EX', 60); // 60 sec expiry

            // Notify opponent
            const opponentId = gameState.whitePlayerId === userId
                ? gameState.blackPlayerId
                : gameState.whitePlayerId;

            io.to(opponentId).emit('draw_offered', { gameId, offeredBy: userId, username });
            socket.emit('draw_offer_sent', { gameId });
        });

        socket.on('accept_draw', async (gameId) => {
            if (!gameId) return;

            const gameJSON = await redis.get(`game:${gameId}`);
            if (!gameJSON) return;

            const gameState = JSON.parse(gameJSON);
            const opponentId = gameState.whitePlayerId === userId
                ? gameState.blackPlayerId
                : gameState.whitePlayerId;

            // Check if opponent offered draw
            const drawOffer = await redis.get(`draw_offer:${gameId}:${opponentId}`);
            if (!drawOffer) {
                socket.emit('draw_error', { error: 'No draw offer to accept' });
                return;
            }

            // End game as draw
            const { Chess } = require('chess.js');
            const { handleGameOver } = require('./game-service');
            const chess = new Chess(gameState.fen);

            const result = await handleGameOver(gameState, chess, 'agreement', 'draw');

            // Cleanup
            await redis.del(`draw_offer:${gameId}:${opponentId}`);

            io.to(gameId).emit('game_over', result.outcome);
        });

        socket.on('decline_draw', async (gameId) => {
            if (!gameId) return;

            const gameJSON = await redis.get(`game:${gameId}`);
            if (!gameJSON) return;

            const gameState = JSON.parse(gameJSON);
            const opponentId = gameState.whitePlayerId === userId
                ? gameState.blackPlayerId
                : gameState.whitePlayerId;

            await redis.del(`draw_offer:${gameId}:${opponentId}`);

            io.to(opponentId).emit('draw_declined', { gameId, declinedBy: userId });
        });

        // ==========================================
        // DISCONNECT
        // ==========================================

        socket.on('disconnect', async (reason) => {
            console.log(`[Socket] User ${userId} disconnected. Reason: ${reason}`);
            await redis.set(`player:disconnected:${userId}`, Date.now());

            // Mark user as offline in DB
            try {
                await UserRepository.setOnline(userId, false);
            } catch (error) {
                console.error(`[Socket] Failed to mark user ${userId} offline:`, error);
            }
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
        const room = io.sockets.adapter.rooms.get(userId);
        const socketCount = room ? room.size : 0;
        console.log(`[Socket] emitToUser: ${event} to ${userId} (${socketCount} sockets in room)`);
        io.to(userId).emit(event, data);
    } else {
        console.warn(`[Socket] emitToUser: io not initialized, cannot emit ${event}`);
    }
};

const emitToRoom = (room, event, data) => {
    if (io) {
        io.to(room).emit(event, data);
    }
};

module.exports = { initSocket, getIO, emitToUser, emitToRoom };
