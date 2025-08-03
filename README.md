# Metaverse Backend

This is the backend server for a 2D Metaverse application, built with Node.js, Express, and Socket.IO. It handles real-time communication for player movement, interactions, and voice chat within different virtual spaces.

## Features

- **Real-time Multiplayer:** Uses Socket.IO to synchronize player data and actions in real-time.
- **Virtual Spaces:** Supports multiple spaces, including a main world and private house rooms, allowing users to move between them.
- **Position Tracking:** Broadcasts player movements and animations to all clients in the same space.
- **Voice Chat:** Streams raw audio data between clients for in-game voice communication.
- **Health Checks:** Includes a simple `/api/ping` endpoint for monitoring server status.

## Project Structure

```
metaverse-backend/
├── src/
│   ├── clases/         # Contains class definitions for spaces (e.g., HouseRoom).
│   ├── config/         # Holds configuration files (e.g., environment variables).
│   ├── routes/         # Defines HTTP API routes (e.g., pingRoutes).
│   ├── socket/         # Core logic for WebSocket event handling.
│   └── index.ts        # Main server entry point.
├── scripts/            # Contains build-related scripts (e.g., fix-imports.js).
├── .env                # Environment variables (should not be committed).
├── package.json        # Project dependencies and scripts.
└── tsconfig.json       # TypeScript compiler options.
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AbdullahMukadam/Metaverse_Backend.git
    cd metaverse-backend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create a `.env` file** in the root of the project and add the necessary environment variables. You can use `.env.example` as a template if it exists.

    ```
    PORT=3001
    ORIGIN=http://localhost:3000
    DEFAULT_SPACE_ID="main_world"
    DEFAULT_HOUSE_ROOM_ID="house_room"
    ```

### Available Scripts

-   **Development:** To run the server in development mode with live reloading:
    ```bash
    npm run dev
    ```

-   **Build:** To compile the TypeScript code into JavaScript for production:
    ```bash
    npm run build
    ```

-   **Start:** To run the built application in production:
    ```bash
    npm run start
    ```

## API Endpoints

-   `GET /`: A simple endpoint that returns a welcome message.
-   `GET /api/ping`: A health check endpoint that returns a JSON object indicating the server is running.

## Socket.IO Events

The server listens for and emits several Socket.IO events to manage the real-time aspects of the metaverse.

### Client-to-Server Events

-   `JoinSpace`: A user requests to join the main world.
-   `UpdatePosition`: A user sends their new position, direction, and movement state.
-   `rawAudio`: A user streams their voice audio data.
-   `enteredHouseRoom`: A user requests to move from the main world to a house room.
-   `UpdateHousePosition`: A user sends their new position while inside a house room.
-   `LeaveHouseMethod`: A user requests to leave a house room and return to the main world.
-   `disconnection`: Fired when a user disconnects.

### Server-to-Client Events

-   `SpaceJoined`: Sent to a user when they successfully join the main world, providing a list of other users.
-   `UserJoined`: Broadcast to all other users when a new user joins the main world.
-   `UserMoved`: Broadcast when a user's position is updated.
-   `incomingAudio`: Broadcasts a user's audio data to others in the same space.
-   `HouseRoomJoined`: Sent to a user when they successfully join a house room.
-   `HouseUserJoined`: Broadcast when a new user joins a house room.
-   `HouseUserMoved`: Broadcast when a user's position is updated inside a house room.
-   `LeaveHouse`: Broadcast when a user leaves a house room.
-   `UserLeft`: Broadcast when a user disconnects from any space.
-   `SpaceError`: Sent if there is an error during a space-related operation.
