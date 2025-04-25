# Current Backend API Structure Documentation

## Overview

The current backend API implements a dual-protocol architecture, combining RESTful HTTP endpoints with WebSocket connections to provide both command-based interactions and real-time data streaming from coffee machines. The server acts as a middleware between the frontend UI and physical coffee machines connected via Bluetooth.

## Architecture Components

### Core Server Components

- **Express.js Server**: Handles HTTP requests and serves static files
- **WebSocket Server**: Provides real-time communication channel
- **Bluetooth Communication Layer**: Connects to physical coffee machines using the Noble library

### Communication Protocols

#### 1. WebSocket Communication
- Uses the `ws` library 
- Streams real-time machine state updates
- Provides immediate feedback of hardware changes
- Implemented in `src/utils/wsStream.ts` (client) and `src/server/index.ts` (server)
- Data is chunked with types defined in `ChunkType` enum:
  - WebSocketClose
  - WebSocketOpen
  - WebSocketError
  - WebSocketMessage

#### 2. HTTP REST API
- Express routes defined in `src/server/router.ts`
- Uses JSON for data exchange
- Main endpoints:
  - `GET /state` - Current machine state
  - `GET /profile-list` - Available brewing profiles
  - `POST /on`, `/off` - Power control
  - `POST /profile-list/:profileId` - Profile selection

### Data Flow

1. **Bluetooth Communication**:
   - Server connects to coffee machines via BLE
   - Reads machine characteristics and state
   - Sends commands to control machine behavior
   - Handled primarily in `src/server/bt.ts`

2. **State Management**:
   - Server maintains `remoteState` representing machine status
   - Changes are broadcast via WebSocket to connected clients
   - Client maintains synchronized state in Zustand store (`src/stores/data.ts`)

3. **Command Processing**:
   - Client sends commands via REST API
   - Server processes commands and forwards to machine via Bluetooth
   - Machine state changes are broadcast back to clients via WebSocket

## Type Definitions

The system uses extensive TypeScript types (in `src/shared/types.ts`) to ensure consistency between frontend and backend, including:

- `RemoteState` - Machine state representation
- `Profile` and `ProfileStep` - Brewing profile definitions
- `Prop` enum - Property identifiers for machine characteristics
- `MajorState` and `MinorState` enums - Machine status indicators
- `ChunkType` - WebSocket message classifications

## Connection Management

- Connection URL handled by `useServerUrl` hook in `src/hooks.ts`
- Connection lifecycle managed by functions in `data.ts` store:
  - `connect()` - Establishes connection to server
  - `disconnect()` - Closes connection
  - `useAutoConnectEffect` - Handles automatic reconnection

## Error Handling

- Server implements error middleware in `src/server/middlewares/errors.ts`
- HTTP status codes communicate error states
- Specific error types defined in `ServerErrorCode` enum
- WebSocket error events provide real-time error notifications

This architecture enables the frontend to interact with physical coffee machines without direct Bluetooth communication, with the backend server handling the complexities of device communication and state management. 