# Legacy State System Component Dependency Analysis

This document identifies components that interact with the legacy state system or translation layers, analyzing impact and required changes for migration to direct R1 data usage.

## 1. Core Components with Legacy Dependencies

### Data Store (src/stores/data.ts)

**Legacy Usage:**
- Maintains dual state representation (`remoteState`, `properties` for legacy; `machineState`, `scaleSnapshot`, etc. for R1)
- Implements `syncR1StateToLegacyState()` to keep legacy representation updated
- Contains legacy connection/disconnection logic

**Impact if Removed:**
- All components consuming legacy state properties would break
- Timer functionality dependent on legacy state properties would fail
- UI updates based on property changes would stop working

**Required Changes:**
- Refactor store to exclusively use R1 data structures
- Update store interface to remove legacy state properties
- Create new derived state selectors based on R1 data
- Reimplement timer functionality using R1 state directly

### Custom Hooks (src/hooks.ts, src/stores/data.ts)

**Legacy Usage:**
- `useShouldUseR1Api()` - Controls which API to use
- `useIsOn()` - Checks if machine is on based on legacy state
- `useStatus()` - Determines machine status from legacy state
- `usePropValue()` - Retrieves values from legacy Properties
- `useMajorState()`, `useMinorState()` - Access legacy state enums
- `usePhase()`, `useConnectionPhase()` - Track connection based on legacy logic

**Impact if Removed:**
- Components using these hooks would not receive state updates
- Status indicators would display incorrect information
- Connection state logic would malfunction

**Required Changes:**
- Create new hooks that directly access R1 state
- Update hook implementations to work with R1 data structure
- Provide equivalent functionality using R1 state values
- Update connection status tracking to use R1 connection state

### UI Components

#### Status Indicators

**Legacy Usage:**
- Read `MajorState`/`MinorState` to determine machine status
- Use legacy properties to show temperature, pressure, flow
- Display connection state based on legacy `remoteState`

**Impact if Removed:**
- Status indicators would show incorrect or no information
- Connection status displays would malfunction
- Temperature and other readings would be missing

**Required Changes:**
- Update to read state directly from R1 data structures
- Map R1 string-based states to UI states directly
- Use R1 connection status values directly

#### Temperature/Pressure Displays

**Legacy Usage:**
- Read from legacy properties like `Prop.GroupHeater`, `Prop.Pressure`
- Track changes via `ShotSampleTime` property updates
- Use legacy state to determine active mode for display

**Impact if Removed:**
- Temperature and pressure displays would not update
- Shot timer functionality would break
- Mode-specific displays would show incorrect information

**Required Changes:**
- Directly consume R1 machine state values
- Create new change detection mechanism with R1 timestamps
- Update mode determination logic to work with R1 state strings

#### Profile Management

**Legacy Usage:**
- Profile data structure follows legacy format
- Profile selection/application uses legacy API paths conditionally
- Profile visualization uses legacy property mapping

**Impact if Removed:**
- Profile selection and application would fail
- Profile visualization would show incorrect information
- Edited profiles might not be properly formatted

**Required Changes:**
- Update profile data structures to match R1 format
- Modify selection/application logic to only use R1 API
- Update visualization to read from R1 profile format

### WebSocket Data Handlers

**Legacy Usage:**
- Translate R1 WebSocket messages to legacy format
- Update legacy state properties with received data
- Trigger UI updates using legacy timestamp mechanism

**Impact if Removed:**
- Real-time updates would not propagate to UI
- WebSocket message handling would throw errors
- Timer and graph updates would malfunction

**Required Changes:**
- Update WebSocket handlers to store data in R1 format directly
- Implement new UI update mechanism based on R1 data changes
- Create direct event propagation from WebSocket to components

### API Adapters (src/api/adapters)

**Legacy Usage:**
- Transform R1 API responses to application models
- Convert application models to R1 format for requests
- Apply conditional logic for API endpoint selection

**Impact if Removed:**
- API requests would send incorrectly formatted data
- Response handling would break due to unexpected formats
- Application models would not be populated correctly

**Required Changes:**
- Update application models to match R1 formats closely
- Simplify adapters to do minimal transformations
- Remove conditional API endpoint selection logic

## 2. Component Dependency Analysis

The dependencies between components form a hierarchical structure:

1. **UI Components** depend on:
   - Custom Hooks (for state access)
   - Data Store (for legacy state values)

2. **Custom Hooks** depend on:
   - Data Store (for state access)
   - Translation Logic (to interpret state)

3. **Data Store** depends on:
   - WebSocket Handlers (for real-time updates)
   - API Adapters (for data fetching/sending)
   - Translation Functions (to map between formats)

4. **WebSocket Handlers** depend on:
   - Translation Functions (to process messages)

5. **API Adapters** depend on:
   - Translation Functions (to format requests/responses)

The core dependency path is:

**UI Components → Hooks → Data Store → Transformers → R1 API**

## 3. Migration Impact Analysis

### Critical Path Components

These components are in the critical path and must be migrated carefully:

1. **Data Store** - The central integration point
   - Houses both legacy and R1 state
   - Orchestrates state synchronization
   - Most critical component to refactor

2. **Custom Hooks** - The main state access mechanism
   - Used by nearly all UI components
   - Must maintain API contract during migration
   - Good opportunity for creating parallel implementations

3. **Timer Logic** - Essential for espresso machine operation
   - Currently depends on legacy state updates
   - Critical to maintain functionality during migration
   - Requires careful reimplementation with R1 data

### Low-Risk Components

These components are easier to migrate or less critical:

1. **Visualization Components** - Can be incrementally updated
   - Can create new versions that work with R1 data
   - Old and new can coexist during transition

2. **Form Controls** - Generally simpler state dependencies
   - Mostly read/write single values
   - Easier to migrate incrementally

## 4. Recommended Migration Strategy

The optimal migration approach is:

1. **Create Parallel Implementations**:
   - Implement new hooks that work directly with R1 state
   - Keep legacy hooks functioning during transition
   - Allow components to migrate one by one

2. **Bottom-Up Migration**:
   - Start with Data Store - eliminate `syncR1StateToLegacyState()`
   - Update API Adapters to simplify transformations
   - Refactor WebSocket handlers to work with R1 data directly
   - Finally update UI components

3. **Incremental Component Updates**:
   - Update one component family at a time
   - Test thoroughly after each component update
   - Maintain backward compatibility until migration is complete

## 5. Visual Dependency Graph

```
┌──────────────────────────────────────────────────────────────┐
│                       UI Components                           │
└────────────┬─────────────────────────────────────┬───────────┘
             │                                     │
             ▼                                     ▼
┌──────────────────────┐                ┌───────────────────────┐
│   Status Indicators   │                │   Data Visualizations │
└──────────┬───────────┘                └───────────┬───────────┘
           │                                        │
           ▼                                        ▼
┌──────────────────────────────────────────────────────────────┐
│                        Custom Hooks                           │
│  useIsOn, useStatus, usePropValue, useMajorState, etc.       │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────┐
│                         Data Store                            │
│              (src/stores/data.ts)                            │
├─────────────────────────┬──────────────────┬─────────────────┤
│                         │                  │                 │
│                         ▼                  ▼                 ▼
│  ┌───────────────────────────┐  ┌───────────────────┐  ┌──────────────┐
│  │ Legacy State (Properties, │  │   R1 State Data   │  │  Connection   │
│  │    RemoteState, etc.)     │  │ (machineState,    │  │    Logic      │
│  └────────────┬──────────────┘  │ scaleSnapshot)    │  └──────┬───────┘
│               │                 └─────────┬─────────┘         │
└───────────────┼──────────────────────────┼─────────────────────
                │                          │                    │
                ▼                          │                    ▼
┌────────────────────────────┐             │         ┌──────────────────┐
│    syncR1StateToLegacyState│◄────────────┘         │ WebSocket Client │
└────────────┬───────────────┘                       └─────────┬────────┘
             │                                                 │
             ▼                                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Translation Layer                              │
│  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐  │
│  │ stateTransformers │ │ restTransformers  │ │ websocketTransf.  │  │
│  └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘  │
└────────────┼─────────────────────┼─────────────────────┼─────────────┘
             │                     │                     │
             └─────────────────────┼─────────────────────┘
                                   ▼
                          ┌─────────────────┐
                          │     R1 API      │
                          └─────────────────┘
```

## 6. Component-Specific Migration Tasks

### Data Store (src/stores/data.ts)

1. Remove `syncR1StateToLegacyState()` function and all calls
2. Remove legacy state properties (`remoteState`, `properties`)
3. Create new derived state selectors for common operations
4. Expose R1 state properties directly
5. Update internal state updates to work with R1 formats

### Custom Hooks

1. Create new R1-specific hooks alongside legacy ones
2. Implement legacy hook functionality using R1 data
3. Update hook documentation to indicate preferred hooks
4. Gradually replace legacy hook usage in components

### UI Components

1. Identify components with most legacy state dependencies
2. Create parallel R1-compatible versions of critical components
3. Update prop interfaces to accept R1 data structures
4. Replace legacy hook usage with R1-specific hooks
5. Test thoroughly to ensure identical functionality

### API Adapters

1. Update model interfaces to closely match R1 formats
2. Simplify transformation functions to minimal type handling
3. Remove conditional API endpoint selection
4. Ensure proper error handling for R1-specific errors

By following this migration path, the codebase can be gradually updated to work directly with R1 data structures while maintaining functionality throughout the transition. 