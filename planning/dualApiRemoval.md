# Dual API Support Removal Implementation Guide

This document provides a step-by-step guide for eliminating the dual API support pattern from the codebase, ensuring the application works exclusively with the R1 API.






## 6. Removing Conditional API Endpoint Logic

### Implementation Steps



## 7. Testing and Verifying Changes

After making these changes, thorough testing is required to ensure all functionality works correctly.

### Testing Steps

1. **Connection Testing**:
   - Verify the application connects to the R1 API
   - Test connection error handling
   - Verify reconnection works as expected

2. **API Endpoint Testing**:
   - Verify all API calls use the correct R1 endpoints
   - Test error handling for API calls

3. **Component Testing**:
   - Verify components display the correct information
   - Ensure all UI functionality works with R1 data

## 8. Handling Special Cases

### WebSocket Connections

Make sure to update WebSocket connection logic to use only R1 WebSocket endpoints:

```typescript
// Before
const wsEndpoint = useR1Api 
  ? `ws://${hostname}:${port}/ws/v1/de1/snapshot` 
  : `ws://${hostname}:${port}/ws`;

// After
const wsEndpoint = `ws://${hostname}:${port}/ws/v1/de1/snapshot`;
```

### Profile Management

Update profile management to work exclusively with R1's profile format:

```typescript
// Always use R1 profile endpoint
const profileEndpoint = '/api/v1/de1/profile';
```

## 9. Final Cleanup

After all changes are implemented and tested:

1. Remove any unused imports related to legacy API
2. Remove unused utility functions that were specific to legacy API
3. Update comments to remove references to dual API support
4. Update documentation to focus solely on R1 API integration 