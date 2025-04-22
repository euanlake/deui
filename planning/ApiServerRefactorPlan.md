# API Server Refactoring Plan for R1 Integration

This document outlines the detailed steps needed to replace our current integrated backend server with ReaPrime (R1), an API-first gateway app for Decent Espresso machines. Each item has a checkbox for tracking progress.

## Understanding R1 Architecture

- [X] **Initial R1 Setup and Configuration**
  - [X] Install R1 on target device (primarily Android) or as a background service
  - [X] Configure R1 to connect with DE1 machine
  - [X] Verify basic functionality with DE1 through R1's interfaces
  - _Prompt: "Set up ReaPrime (R1) on the target device and verify it can communicate with the DE1 machine through its API endpoints. Document the installation process for development environments."_

- [X] **Review R1 API Documentation**
  - [X] Study the R1 API v1 documentation and OpenAPI YAML specification
  - [X] Map current endpoints to equivalent R1 endpoints
  - [X] Identify gaps in functionality that may need custom solutions
  - _Prompt: "Create a mapping table showing our current API endpoints and the equivalent R1 endpoints. Identify any functionality gaps that will need custom solutions."_

## Frontend Client Modifications

- [X] **Create R1 API Adapter Layer**
  - [X] Implement HTTP adapter for R1 REST endpoints
    - [X] Create functions for machine state control (on/off, start/stop shots)
    - [X] Create functions for machine settings (temperatures, profiles)
    - [X] Create functions for scale operations (tare, reading)
  - [X] Implement WebSocket adapter for real-time updates
    - [X] Handle shot updates stream
    - [X] Handle scale weight updates stream
  - _Prompt: "Develop an API adapter layer that interfaces with R1's REST endpoints and WebSockets, following the adapter pattern to isolate R1-specific code from the rest of the application."_

- [X] **Refactor WebSocket Implementation**
  - [X] Update `wsStream.ts` to connect to R1 WebSocket endpoints
  - [X] Create data transformation functions to convert between R1 format and our app's format
  - [X] Implement connection status management and reconnection logic
  - _Prompt: "Refactor the WebSocket implementation to connect to R1's WebSocket endpoints. Create functions that transform R1's real-time data format into our application's expected format."_

- [X] **Update REST API Client**
  - [X] Replace current axios endpoints with R1 endpoints
  - [X] Implement data transformation for different response structures
  - [X] Add new R1-specific endpoints that weren't in our original API
    - [X] Scale management endpoints
    - [X] Profile v2 JSON upload functionality
  - _Prompt: "Update the REST API client to use R1 endpoints instead of our current backend. Create transformation functions to adapt R1's response structure to match what our application expects."_

- [X] **Refactor State Management**
  - [X] Update Zustand store in `data.ts` to work with R1's data structures
  - [X] Create middleware or selectors to transform R1 data into our app's format
  - [X] Ensure all hooks continue to work with the modified state structure
  - [X] Add new state slices for R1-specific features (scale support)
  - _Prompt: "Refactor the state management to handle R1's data structures. Create middleware or selectors that transform data between formats while ensuring all existing hooks continue to work."_

- [X] **Update Connection Management**
  - [X] Modify `useServerUrl` hook to target R1's service address
  - [X] Update connection and reconnection logic for R1's requirements
  - [X] Implement R1-specific connection status monitoring
  - _Prompt: "Update the connection management to target R1's service address. Modify the connection logic to handle R1's specific connection requirements and status indicators."_

- [X] **Handle Error States**
  - [X] Map R1 error codes to application error states
  - [X] Implement R1-specific error handling
  - [X] Create user-friendly error messages for R1 connection issues
  - _Prompt: "Create a mapping between R1's error codes and our application's error states. Implement specific error handling for R1 connection issues with user-friendly messages."_

## Adding New R1-Specific Functionality

- [ ] **Implement Scale Support**
  - [ ] Add UI components for scale operations
  - [ ] Implement tare functionality
  - [ ] Create real-time weight display using WebSocket data
  - [ ] Support multiple scale types (Felicita Arc, Decent Scale, Bookoo)
  - _Prompt: "Implement scale support using R1's scale API. Create UI components for scale operations and real-time weight display, supporting all compatible scale types."_

- [X] **Enhance Profile Management**
  - [X] Update profile handling to support v2 JSON profiles
  - [X] Create interface for uploading profiles to the machine
  - [X] Implement profile selection and application
  - _Prompt: "Enhance the profile management to support v2 JSON profiles. Create an interface for uploading, selecting, and applying profiles through R1's API."_

## Server-Side Removal

- [X] **Remove Redundant Server Dependencies**
  - [X] Remove `express` dependency
  - [X] Remove `ws` WebSocket server library
  - [X] Remove `@abandonware/noble` Bluetooth library
  - [X] Remove other backend-specific dependencies
  - _Prompt: "Remove all server-side dependencies that are no longer needed now that R1 handles the backend functionality. Update package.json to reflect these changes."_

- [X] **Remove Server-Side Code**
  - [X] Remove `src/server` directory and all contained files
  - [X] Update build scripts to no longer build server components
  - [X] Remove server-specific middleware and utility functions
  - _Prompt: "Remove the server-side code directory and all related files. Update build scripts to exclude server components and remove any utility functions specific to the server."_

- [X] **Update Package Scripts**
  - [X] Remove `build-server` script from package.json
  - [X] Update `dev` script to no longer start local server
  - [X] Remove `ws` script that starts WebSocket server
  - [X] Update `start` script to only launch client application
  - _Prompt: "Update the package scripts to remove server-related commands and simplify to client-only operation. Modify the development workflow to account for R1 running as a separate service."_

- [ ] **Update Configuration**
  - [ ] Create environment variables for R1 API endpoints
  - [ ] Implement configuration for development vs. production R1 instances
  - [ ] Add documentation for setting up R1 connections
  - _Prompt: "Create environment variable configuration for R1 API endpoints. Implement separate configurations for development and production environments with clear documentation."_

## Testing and Verification

- [ ] **Implement Automated Tests for R1 Integration**
  - [ ] Create unit tests for R1 API adapter layer
  - [ ] Update integration tests to use R1 API
  - [ ] Create mocking strategy for testing without live R1 connection
  - _Prompt: "Develop automated tests for the R1 API adapter layer. Update existing tests to work with R1 and create mocks for testing without a live connection."_

- [ ] **Create R1-specific Testing Plan**
  - [ ] Test machine state control (on/off, shot control)
  - [ ] Test profile upload and selection
  - [ ] Test real-time data through WebSockets (shot data, temperature)
  - [ ] Test scale integration (tare, weight tracking)
  - [ ] Test error handling and recovery
  - _Prompt: "Create a comprehensive testing plan for R1 integration covering all major functionality: machine control, profile management, real-time data, scale integration, and error handling."_

- [ ] **Performance Comparison**
  - [ ] Measure and compare latency between original backend and R1
  - [ ] Test WebSocket performance for real-time updates
  - [ ] Verify stability during extended operation with R1
  - _Prompt: "Perform comparative performance testing between the original backend and R1. Measure latency, WebSocket update rates, and long-term stability."_

## Documentation

- [ ] **Create R1 Integration Guide**
  - [ ] Document R1 setup process
  - [ ] Document API endpoints and their usage
  - [ ] Provide examples of common operations with R1
  - [ ] Create troubleshooting section for common R1 issues
  - _Prompt: "Create a comprehensive R1 integration guide covering setup, API usage, examples, and troubleshooting. Make this accessible to both end-users and developers."_

- [ ] **Update Development Workflow**
  - [ ] Document how to run R1 in development environments
  - [ ] Update local development setup instructions
  - [ ] Provide debugging tips for R1 communication issues
  - _Prompt: "Update the development workflow documentation to include running and debugging with R1. Include common issues and their solutions."_

## Deployment

- [ ] **Update Build Pipeline**
  - [ ] Modify build process to exclude server components
  - [ ] Configure environment variables for production R1 endpoints
  - [ ] Update deployment scripts if needed
  - _Prompt: "Update the build pipeline to remove server components and configure for production R1 endpoints. Ensure deployment scripts reflect the new architecture."_

- [ ] **Create R1 Migration Strategy**
  - [ ] Plan phased approach to migrate users to R1-based solution
  - [ ] Create fallback mechanisms to original backend if needed
  - [ ] Develop monitoring strategy for R1 integration issues
  - _Prompt: "Develop a migration strategy for transitioning users to the R1-based solution. Include fallback mechanisms and monitoring strategy for the transition period."_

## Additional R1-Specific Considerations

- [ ] **Handle Multi-Platform Support**
  - [ ] Ensure R1 works across all required platforms
  - [ ] Test on Android (primary), but also validate on other platforms as needed
  - [ ] Document platform-specific setup requirements
  - _Prompt: "Test R1 integration across all required platforms, with primary focus on Android. Document any platform-specific considerations or limitations."_

- [ ] **Scale Integration Testing**
  - [ ] Test with all supported scale models (Felicita Arc, Decent Scale, Bookoo)
  - [ ] Document scale-specific configuration steps
  - [ ] Create fallback UI for users without scales
  - _Prompt: "Test integration with all supported scale models. Create documentation for scale-specific setup and ensure the UI degrades gracefully for users without scales."_

- [ ] **User Education**
  - [ ] Create materials explaining the transition to R1
  - [ ] Document any new features or changes in behavior
  - [ ] Provide support channels for migration issues
  - _Prompt: "Create user education materials explaining the R1 transition, highlighting new features and any behavioral changes. Establish support channels for migration assistance."_ 