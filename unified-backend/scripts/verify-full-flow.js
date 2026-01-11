const io = require('socket.io-client');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';

// Helper to Create User
async function createUser(prefix) {
    const username = `${prefix}_${uuidv4().substring(0, 5)}`;
    const email = `${username}@test.com`;
    const password = 'password123';

    try {
        console.log(`Creating user: ${username}`);
        const res = await axios.post(`${BASE_URL}/auth/register`, { username, email, password });
        return { ...res.data.user, token: res.data.token, password };
    } catch (err) {
        console.error('Registration failed', err.response?.data || err.message);
        throw err;
    }
}

// Helper to Connect Socket
function connectSocket(token) {
    return new Promise((resolve, reject) => {
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: false
        });

        socket.on('connect', () => resolve(socket));
        socket.on('connect_error', (err) => reject(err));

        // Debug
        socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
    });
}

async function runTest() {
    console.log('=== Starting End-to-End Verification ===');

    try {
        // 1. Create two users
        const userA = await createUser('UserA');
        const userB = await createUser('UserB');

        // 2. Connect Sockets
        console.log('Connecting sockets...');
        const socketA = await connectSocket(userA.token);
        const socketB = await connectSocket(userB.token);
        console.log('Sockets connected.');

        // 3. Setup Matchmaking Listeners
        const matchPromise = new Promise((resolve) => {
            let matches = 0;
            const handler = (data) => {
                console.log('Match found event received:', data);
                matches++;
                if (matches === 2) resolve(data.gameId);
            };
            socketA.on('match_found', handler);
            socketB.on('match_found', handler);
        });

        // 4. Join Matchmaking
        console.log('Joining matchmaking queue (Blitz)...');
        await axios.post(`${BASE_URL}/matchmaking/join`, {
            userId: userA.userId,
            timeControl: 'blitz',
            rating: 1200
        }, { headers: { Authorization: `Bearer ${userA.token}` } });

        await axios.post(`${BASE_URL}/matchmaking/join`, {
            userId: userB.userId,
            timeControl: 'blitz',
            rating: 1200
        }, { headers: { Authorization: `Bearer ${userB.token}` } });

        // 5. Wait for Match
        console.log('Waiting for match...');
        const gameId = await matchPromise;
        console.log(`Match created: ${gameId}`);

        // 6. Join Game Room
        console.log('Joining game room...');
        socketA.emit('join_game', gameId);
        socketB.emit('join_game', gameId);

        // 7. Get Game State to see who is white
        const gameRes = await axios.get(`${BASE_URL}/games/live/${gameId}`, {
            headers: { Authorization: `Bearer ${userA.token}` } // any token works
        });
        const whiteId = gameRes.data.whitePlayerId;
        const whiteUser = whiteId === userA.userId ? userA : userB;
        const whiteSocket = whiteId === userA.userId ? socketA : socketB;

        console.log(`White player is: ${whiteUser.username}`);

        // 8. Make a Move (e4)
        console.log('Attempting move e2 -> e4...');

        const movePromise = new Promise((resolve) => {
            // Listen on BOTH for state update
            let updates = 0;
            const handler = (data) => {
                console.log('Game state update received due to move.');
                updates++;
                if (updates >= 1) resolve(data); // Resolve on first receipt
            };
            socketA.on('game_state', handler);
            socketB.on('game_state', handler);
        });

        whiteSocket.emit('move', {
            gameId,
            move: { from: 'e2', to: 'e4' }
        });

        await movePromise;
        console.log('Move verified via socket update.');

        console.log('=== VERIFICATION SUCCESS ===');
        console.log('Cleaning up...');
        socketA.disconnect();
        socketB.disconnect();

        process.exit(0);

    } catch (err) {
        console.error('VERIFICATION FAILED:', err);
        process.exit(1);
    }
}

runTest();
