# R1 Migration Documentation

## Overview

This document outlines the changes made to migrate from our custom backend server architecture to the R1 API-based architecture. The migration removes direct device connection handling and moves it to the R1 system, simplifying our application to be a frontend-only client.

## Changes Made

### 1. Removed Server-Side Dependencies

The following server-side dependencies have been removed:

- **Server Framework**:
  - `express` - No longer needed as R1 provides the HTTP server
  - `body-parser` - Express middleware
  - `cors` - Express middleware
  - `morgan` - Logging middleware
  - `serve-static` - Static file serving

- **WebSocket**:
  - `ws` - WebSocket server implementation

- **Bluetooth Communication**:
  - `@abandonware/noble` - BLE communication library

- **Server Utilities**:
  - `debug` - Debugging utility
  - `http-proxy-middleware` - API proxying
  - `esbuild` - Server-side bundling

- **Related Dev Dependencies**:
  - `@types/cors`
  - `@types/debug`
  - `@types/express`
  - `@types/morgan`
  - `@types/ws`
  - `concurrently` - Used to run server and client concurrently

### 2. Updated Build Scripts

- Removed server build scripts (`build-server`, `ws`, `start`, `pkg:build-server`)
- Updated `pkg:build` to only build the client application

### 3. Removed Binary Reference

- Removed `bin` field from package.json which pointed to the server executable

## Code Structure Changes

The server-related code in `src/server/` directory is now obsolete and can be removed. The R1 adapter pattern implemented in the `src/api/` directory replaces this functionality.

### Key Architecture Differences

#### Old Architecture
- Custom Express server
- Direct Bluetooth connection to devices
- WebSocket server for real-time updates
- Server-side state management

#### New Architecture (R1-based)
- HTTP client connecting to R1 API
- WebSocket client connecting to R1 WebSocket endpoints
- Client-side state management only
- Adapter pattern to abstract R1 API specifics

## Next Steps

1. Remove the obsolete `src/server/` directory
2. Update client code that might still reference the old server implementation 
3. Ensure all components use the new R1 API adapter pattern

## API Mapping

For a detailed mapping between our previous API endpoints and the new R1 endpoints, refer to the `planning/ApiEndpointMapping.md` document. 