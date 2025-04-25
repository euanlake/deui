# Legacy Code References Analysis

This document identifies and analyzes references to legacy code across the codebase, focusing on components that need to be removed or refactored as part of the R1 migration cleanup.

## Core Legacy References

### 1. State Management References

| File Path | Line Number | Reference Context | Reference Type | Analysis |
|-----------|-------------|-------------------|----------------|----------|
| src/stores/data.ts | 49 | `// Legacy state` | State | Comment marking the beginning of legacy state properties in the store |
| src/stores/data.ts | 89 | `syncR1StateToLegacyState: () => void` | State Translation | Function signature for the core translation layer between R1 and legacy state |
| src/stores/data.ts | 159-160 | `// Setup state sync middleware to update legacy state when R1 state changes const syncR1StateToLegacyState = () => {` | State Translation | Implementation of the sync function that maintains compatibility with old state structure |
| src/stores/data.ts | 458 | `syncR1StateToLegacyState,` | State Translation | Exposing the sync function in the store interface |
| src/stores/data.ts | 629, 641 | `// Reset legacy state for compatibility`, `// Reset legacy state` | State Management | Clean-up logic when disconnecting from the API |
| src/stores/data.ts | 783, 905, 926, 969 | `wsState: WebSocketState.Opening // Update legacy state for compatibility` (and similar) | WebSocket | Updating WebSocket state in legacy format for backward compatibility |
| src/stores/data.ts | 1102-1103 | `// Sync with legacy state after update get().syncR1StateToLegacyState()` | State Translation | Synchronizing updated R1 state to legacy state |
| src/stores/data.ts | 1268 | `// Legacy hooks that work with both legacy and R1 state` | Hooks | Comment indicating hooks that support both state systems |
| src/stores/data.ts | 1369-1370 | `console.log('Syncing R1 state to legacy state'); useDataStore.getState().syncR1StateToLegacyState();` | State Translation | Manual state sync in the codebase |

### 2. API and Connection Related 

| File Path | Line Number | Reference Context | Reference Type | Analysis |
|-----------|-------------|-------------------|----------------|----------|
| src/hooks.ts | 156 | `* @returns {boolean} true if should use R1 API, false for legacy API` | API | Function documentation showing dual API support pattern |
| src/stores/data.ts | 461 | `// Legacy connection method` | Connection | Beginning of legacy connection code |
| src/stores/data.ts | 468 | `// Continue with legacy connection` | Connection | Conditional branch for legacy connection path |
| src/stores/data.ts | 592 | `// Legacy disconnect method` | Connection | Disconnect code specific to old server |
| src/stores/data.ts | 637 | `// Legacy disconnect` | Connection | Another legacy disconnection reference |
| src/stores/data.ts | 1030 | `// Otherwise use legacy connection` | Connection | Fallback to legacy connection method |
| src/stores/data.ts | 1484 | `// Legacy connection phase` | Connection | References to old connection phase tracking |

### 3. Transformer Functions

| File Path | Line Number | Reference Context | Reference Type | Analysis |
|-----------|-------------|-------------------|----------------|----------|
| src/api/transformers/stateTransformers.ts | 5 | `// Map R1 API machine states to legacy MajorState/MinorState` | State Translation | Core transformer that maintains compatibility with old state model |
| src/api/transformers/stateTransformers.ts | 7-24 | `const machineStateMap: Record<string, { major: MajorState, minor: MinorState }> = {...}` | State Translation | Mapping table between R1 states and legacy states |
| src/api/transformers/stateTransformers.ts | 192 | `// Map the scale weight to the legacy Prop.Weight property` | State Translation | Scale data transformation to legacy property format |
| src/api/transformers/restTransformers.ts | 7-124 | Various transform functions | Data Translation | Collection of functions that transform between R1 and application data models |
| src/api/transformers/websocketTransformers.ts | 6-103 | WebSocket data transformation functions | Data Translation | Functions that transform real-time WebSocket data |

## UI Component References

Most UI components appear to use the translated state rather than directly referencing legacy code. The components consume the data through hooks that access the store, which has already processed the translations.

## Profile Legacy References

All profile JSON files in `/public/profiles/` contain a `"legacy_profile_type"` property. These appear to be part of the data model rather than implementation code. These are likely needed for compatibility with the machine firmware and should be preserved.

## Translation Layer Architecture Analysis

The codebase implements a comprehensive translation layer that:

1. **Maintains State Compatibility**: The `syncR1StateToLegacyState` function in `data.ts` synchronizes R1 data structures to the legacy format whenever state changes
2. **Transforms API Data**: Transformers in `src/api/transformers/` convert between R1 API formats and application data models
3. **Provides Compatibility Hooks**: Custom hooks provide unified access to state regardless of which API is being used

This architecture allows the application to work with both the legacy server and the R1 API, but adds significant complexity and overhead. The translation layer touches core parts of the state management system and is deeply integrated with the application flow.

## Dependencies and Integration Points

Primary integration points where the legacy code interfaces with modern components:

1. **State Management**: The state store (`src/stores/data.ts`) is the central integration point, maintaining both legacy and R1 state
2. **API Adapters**: The R1 API adapters call transformers to convert data before storing it
3. **WebSocket Connections**: WebSocket handlers transform real-time data from R1 to the legacy format

## Removal Impact Analysis

Removing the legacy code will require updates to:

1. **State Store Interface**: Remove legacy properties and translation function
2. **Component Hooks**: Update hooks that currently support both state formats
3. **WebSocket Handlers**: Simplify to work directly with R1 data
4. **API Adapters**: Remove unnecessary transformations

The removal should be done incrementally, starting with the dual API support pattern, then the translation functions, followed by updating components to work directly with R1 data.

## Recommended Removal Approach

Based on this analysis, we recommend following the phased approach outlined in the main refactoring plan, with special attention to:

1. First removing the `useShouldUseR1Api()` hook to eliminate conditional logic
2. Next removing the `syncR1StateToLegacyState` function and all calls to it
3. Gradually updating components to use R1 state directly
4. Finally removing transformer functions that are no longer needed

This approach minimizes risk by incrementally moving away from the legacy compatibility layer while ensuring the application continues to function throughout the process. 