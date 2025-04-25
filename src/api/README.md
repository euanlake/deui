# API Adapter Architecture

## Overview

This API adapter layer provides a consistent interface for communicating with the R1 backend while allowing the application to work with its own data models. The adapter pattern isolates R1-specific code and allows for easy switching between different API providers (e.g., mock implementation for testing).

## Directory Structure

- `/interfaces` - Core interfaces that define the API contract
- `/models` - Data models used throughout the application
- `/adapters` - Implementations of the interfaces for different backends
  - `/r1` - R1-specific adapter implementations
  - `/mock` - Mock implementations for testing and development
- `/transformers` - Data transformation utilities

## Transformers

### REST API Transformers (`restTransformers.ts`)

These transformers convert between R1's REST API response formats and our application's data models:

- `transformR1DeviceToDevice` - Converts R1 device data to application's Device format
- `transformR1MachineStateToMachineState` - Converts R1 machine state to application's MachineState format
- `transformR1ScaleToScale` - Converts R1 scale data to application's Scale format
- `transformR1ShotSettingsToShotSettings` - Converts R1 shot settings to application's format
- `transformShotSettingsToR1ShotSettings` - Converts application's shot settings to R1 format
- `transformProfileToR1Profile` - Converts application's profile to R1 format

### WebSocket Transformers (`websocketTransformers.ts`)

These transformers handle real-time data from WebSocket connections:

- `transformR1MachineSnapshotToMachineState` - Converts real-time machine data
- `transformR1ScaleSnapshotToScale` - Converts real-time scale data
- `transformR1ShotSettingsToShotSettings` - Converts real-time shot settings
- `transformR1WaterLevelsToWaterLevels` - Converts real-time water level data
- `transformR1WebSocketData` - General-purpose transformation function

## R1 API Endpoints

The adapter uses the following R1 API endpoints:

### Device Endpoints
- `GET /api/v1/devices` - Get available devices
- `GET /api/v1/devices/scan` - Scan for new devices

### Machine Endpoints
- `GET /api/v1/de1/state` - Get current machine state
- `PUT /api/v1/de1/state/<newState>` - Set machine state
- `POST /api/v1/de1/profile` - Upload brewing profile
- `POST /api/v1/de1/shotSettings` - Update shot settings
- `PUT /api/v1/de1/usb/<state>` - Toggle USB charger mode

### Scale Endpoints
- `PUT /api/v1/scale/tare` - Tare the selected scale

### WebSocket Endpoints
- `GET /ws/v1/de1/snapshot` - Real-time machine state updates
- `GET /ws/v1/de1/shotSettings` - Real-time shot settings updates
- `GET /ws/v1/de1/waterLevels` - Real-time water level updates
- `GET /ws/v1/scale/snapshot` - Real-time scale weight updates

## Usage

```typescript
// Create a provider
const apiProvider = new R1ApiProvider('http://localhost:3000');

// Use the provider
const devices = await apiProvider.device.getDevices();
const machineState = await apiProvider.machine.getState();

// Connect to WebSockets
const machineConnection = apiProvider.websocket.connectToMachineSnapshot();
machineConnection.onMessage((data) => {
  console.log('New machine data:', data);
});
``` 