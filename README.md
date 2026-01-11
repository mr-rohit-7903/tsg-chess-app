# Real-Time Multiplayer Chess Platform

## 1️⃣ Project Overview

**Chess Platform** is a modern, high-performance real-time multiplayer chess application built for seamless competitive play. It solves the problem of reliable, low-latency chess matchmaking and gameplay handling in a distributed environment.

**Key Features:**
- **Real-time Multiplayer:** Instant move updates and game state synchronization using WebSockets.
- **Matchmaking System:** Intelligent queuing system that pairs players based on rating and time controls (Bullet, Blitz, Rapid).
- **Pro Performance:** Optimized for low latency, handling rapid-fire moves without desync.
- **Elo Rating System:** Full implementation of the Elo rating algorithm to track player skill progression.
- **Game History & Analytics:** Persistent storage of past games with detailed result tracking (Checkmate, Timeout, Resignation, Draw).
- **Robust State Management:** Redis-backed active game state ensuring data integrity even during server restarts.

## 2️⃣ Folder & File Structure

### Client (`/client`)
Built with React, TypeScript, and Vite for a lightning-fast frontend experience.

```
client/
├── src/
│   ├── pages/         # High-level application views
│   │   ├── Game.tsx       # Main gameplay interface (board, timer, chat)
│   │   ├── Profile.tsx    # User stats, history, and settings
│   │   ├── Matchmaking.tsx# Queue interface and mode selection
│   │   └── Login.tsx      # Authentication forms
│   ├── components/    # Reusable UI building blocks
│   │   ├── ui/            # Atomic visual components (Buttons, Cards, Inputs)
│   │   └── ChessBoard/    # Complex game board rendering logic
│   ├── hooks/         # Custom React hooks
│   │   ├── use-auth.tsx   # User session management
│   │   └── use-socket.tsx # WebSocket connection abstraction
│   ├── lib/           # Core utilities
│   │   ├── api.ts         # REST API client wrapper
│   │   └── chess-utils.ts # Helper functions for move validation
│   └── context/       # Global state providers (Auth, Socket)
```

### Backend (`/unified-backend`)
A unified Node.js/Express server handling API requests, WebSocket events, and game logic execution.

```
unified-backend/
├── src/
│   ├── models/        # MongoDB Schemas (User, GameHistory)
│   ├── routes/        # REST API Endpoints
│   │   ├── auth.js        # JWT authentication logic
│   │   └── games.js       # Game controls (resign, timeout)
│   ├── services/      # Core Business Logic
│   │   ├── game-service.js       # Rules enforcement, state updates, game over logic
│   │   ├── socket-service.js     # Real-time event handling (connection, moves)
│   │   └── matchmaking-service.js# Queue management and pairing logic
│   ├── lib/           # Shared Libraries
│   │   └── rating.js      # Elo calculation algorithms
│   └── index.js       # Server entry point
├── scripts/       # Maintenance utilities
│   └── clear-redis.js # State cleanup tools
```

## 3️⃣ How to Run the Project

### Prerequisites
- **Node.js** (v16+)
- **Redis Server** (Running locally or hosted)
- **MongoDB** (Running locally or Atlas URI)

### Environment Setup
Create a `.env` file in `unified-backend/`:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/chess-app
JWT_SECRET=your_super_secret_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
CLIENT_URL=http://localhost:5173
```

### Step-by-Step Startup

1.  **Start the Backend**
    ```bash
    cd unified-backend
    npm install
    npm run dev
    ```
    *Output should confirm: "Connected to MongoDB", "Connected to Redis", "Server running on port 3001"*

2.  **Start the Frontend**
    ```bash
    cd client
    npm install
    npm run dev
    ```
    *Output should show local server link: http://localhost:5173*

3.  **Play!**
    Open `http://localhost:5173` in two different browser windows (or incognito) to simulate two players.

## 4️⃣ How the Game Works (Runtime Flow)

1.  **Authentication:** User registers/logs in -> Server issues JWT -> Client stores token.
2.  **Matchmaking:** User selects mode (e.g., Blitz) -> Client sends request -> Backend adds user to Redis Queue.
3.  **Pairing:** Interval runs every 2s -> Checks queue -> Pairs users with similar ELO -> Creates Game ID -> Emits `match_found`.
4.  **Game Initialization:** Clients receive Game ID -> Connect to Socket Room `game:{id}` -> Fetch initial state.
5.  **Gameplay:**
    *   Player A makes move -> Client validates move locally -> Emits `move` event.
    *   Server validates move (chess.js) -> Updates Redis state -> Broadcasts `move_applied`.
    *   Player B receives `move_applied` -> Updates board.
6.  **Game Over:** Checkmate/Resign/Timeout -> Server calculates result -> Updates MongoDB History & Ratings -> Broadcasts `game_over`.
7.  **Post-Game:** Modal appears with result and rating change -> Redis active game key expires.

## 5️⃣ Algorithms Used

*   **Chess Logic:** Powered by `chess.js` for move generation, validation, and FEN string manipulation.
*   **Matchmaking:** Reliable Queue-based system. Users are bucketed by Time Control. Simple greedy matching pairs users within a rating deviation threshold (currently strict, expandable).
*   **Elo Rating:** Standard Elo algorithm. (cannocial elo formulation)
    *   `ExpectedScore = 1 / (1 + 10^((RatingB - RatingA) / 400))`
    *   `NewRating = OldRating + K * (ActualScore - ExpectedScore)` (K=32).
*   **State Locking:** Redis atomic operations (SETNX) used to prevent race conditions during move processing and Game Over claims.

## 6️⃣ System Architecture

The system follows a **Stateful Hybrid Architecture**:

```
[Client A] <--(WebSocket)--> [Node.js Server] <--(WebSocket)--> [Client B]
                                   |
                             [Redis Cache] <--- (Active Game States, Matchmaking Queues)
                                   |
                             [MongoDB DB]  <--- (User Profiles, Game History)
```

*   **Hot Data (Redis):** Moves, timers, active game sessions. Optimized for speed using in-memory operations.
*   **Cold Data (MongoDB):** Persistent user records, match history. Optimized for reliability and analytics.
*   **Realtime Layer:** Socket.IO serves as the event bus, pushing state changes instantly to connected clients.

## 7️⃣ Error Handling & Reliability

*   **Reconnection Logic:** Client automatically attempts to rejoin the socket room if connection drops. `fetchGameState` runs on mount to sync any missed events.
*   **Stale State Protection:** Backend tracks `lastMoveTimestamp`. Validates moves against current Redis state to prevent "ghost moves" from laggy clients.
*   **Crash Recovery:** Since active game state lives in Redis (external to Node process), the server can restart without killing active games. Players simply reconnect.
*   **Auth Failures:** JWT expiry or invalid tokens trigger an automatic logout/redirect to login on the client.

## 8️⃣ Tech Stack

**Frontend:**
*   React 18 + TypeScript
*   Vite (Build Tool)
*   TailwindCSS (Styling)
*   Shadcn/UI (Component Library)
*   Chess.js / React-Chessboard

**Backend:**
*   Node.js + Express
*   Socket.IO (WebSockets)
*   Redis (ioredis)
*   MongoDB (Mongoose)

## 9️⃣ Future Improvements

-   **Spectator Mode:** Allow users to watch live games by joining existing socket rooms.
-   **Engine Analysis:** Integrate Stockfish WASM for post-game analysis on the client.
-   **Chat System:** Real-time chat within game rooms using the existing socket connection.
-   **Deployment pipelines:** Dockerize services for easy orchestration.
