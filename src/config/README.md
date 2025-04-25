# R1 API Environment Configuration

This directory contains configuration for connecting to R1 API endpoints in different environments (development and production).

## Overview

The `env.ts` file provides environment-specific configurations for API endpoints, automatically selecting the appropriate configuration based on the current environment.

## Environment Variables

The following environment variables can be used to override the default configurations:

| Variable | Description | Default (Development) | Default (Production) |
|----------|-------------|----------------------|----------------------|
| `VITE_R1_API_URL` | Base URL for R1 REST API | `http://localhost:8000/api` | `http://<tablet-ip>/api` |
| `VITE_R1_WS_URL` | Base URL for R1 WebSocket API | `ws://localhost:8000/ws` | `ws://<tablet-ip>/ws` |

## How to Configure

### For Development

Create a `.env.development` file in the project root:

```
VITE_R1_API_URL=http://localhost:8000/api
VITE_R1_WS_URL=ws://localhost:8000/ws
```

### For Production

Create a `.env.production` file in the project root:

```
VITE_R1_API_URL=http://actual-tablet-ip/api
VITE_R1_WS_URL=ws://actual-tablet-ip/ws
```

Replace `actual-tablet-ip` with the IP address of the tablet running the R1 API.

## Usage

Import the configuration in your code:

```typescript
import { R1ApiConfig } from 'src/config/env';

// Using REST API endpoints
const fetchDevices = async () => {
  const response = await fetch(R1ApiConfig.endpoints.devices);
  return response.json();
};

// Using WebSocket endpoints
const connectToMachineSnapshot = () => {
  const ws = new WebSocket(R1ApiConfig.wsEndpoints.machineSnapshot);
  return ws;
};
```

## Available Endpoints

### REST API Endpoints

- `devices`: Get available devices
- `deviceScan`: Scan for devices
- `machineState`: Get DE1 machine state
- `setMachineState(newState)`: Request DE1 state change
- `setProfile`: Set DE1 profile
- `setShotSettings`: Update shot settings
- `setUsbCharger(state)`: Toggle USB charger mode
- `tareScale`: Tare the connected scale

### WebSocket Endpoints

- `machineSnapshot`: Receive real-time snapshot data
- `shotSettings`: Receive real-time shot settings updates
- `waterLevels`: Receive real-time water level updates
- `scaleSnapshot`: Receive real-time weight data 