# Data Model Translation Analysis: Legacy System to R1 API

This document analyzes the data models used in both the legacy system and R1 API, documenting how fields translate between systems and evaluating each transformer function.

## 1. Core Data Models Comparison

### Machine State Model

| Legacy Model (MajorState/MinorState/Properties) | R1 API Model | Translation Notes |
|------------------------------------------------|--------------|------------------|
| `MajorState` enum (Espresso, Steam, HotWater, etc.) | String-based state with substate (e.g., "espresso.pour") | Complex mapping through `machineStateMap` in `stateTransformers.ts` |
| `MinorState` enum (PreInfuse, Pour, Steaming, etc.) | Substate component of state string | Mapped using conditional logic in `machineStateToProperties()` |
| `Prop.GroupHeater` | `machineState.groupTemperature` | Direct mapping |
| `Prop.TargetGroupHeater` | `machineState.targetGroupTemperature` | Direct mapping |
| `Prop.WaterHeater` | `machineState.mixTemperature` | Renamed field |
| `Prop.ShotGroupFlow`, `Prop.Flow` | `machineState.flow` | Same value mapped to multiple legacy props |
| `Prop.ShotGroupPressure`, `Prop.Pressure` | `machineState.pressure` | Same value mapped to multiple legacy props |
| `Prop.ShotFrameNumber` | `machineState.profileFrame` | Direct mapping |
| `Prop.ShotSampleTime` | Generated timestamp during transformation | Created during translation, not from source data |
| `Prop.WaterCapacity`, `Prop.WaterLevel` | Not directly available in R1 snapshot | Hardcoded defaults or from separate API |

### Scale Model

| Legacy Model | R1 API Model | Translation Notes |
|--------------|--------------|------------------|
| `Prop.Weight` | `scaleSnapshot.weight` | Direct mapping |
| Not tracked in legacy | `scaleSnapshot.batteryLevel` | New in R1, not used in legacy |
| Not tracked in legacy | `scaleSnapshot.timestamp` | New in R1, not used in legacy |

### Profile Model

| Legacy Model | R1 API Model | Translation Notes |
|--------------|--------------|------------------|
| `Profile` (custom format) | JSON profile format (v2) | Complex bi-directional translation |
| `Profile.title` | `title` | Direct mapping |
| `Profile.steps` | `steps` | Direct mapping with potential differences in step structure |
| `Profile.targetVol` | `target_volume` | Renamed field |
| `Profile.targetWeight` | `target_weight` | Renamed field |
| `Profile.targetTemp` | `tank_temperature` | Renamed field |

### Shot Settings Model

| Legacy Model | R1 API Model | Translation Notes |
|--------------|--------------|------------------|
| `Prop.TargetEspressoVol` | `shotSettings.targetShotVolume` | Direct mapping |
| `Prop.TargetGroupTemp` | `shotSettings.groupTemp` | Direct mapping |
| `Prop.SteamSettings` | `shotSettings.steamSetting` | Direct mapping |
| `Prop.TargetSteamTemp` | `shotSettings.targetSteamTemp` | Direct mapping |
| `Prop.TargetSteamLength` | `shotSettings.targetSteamDuration` | Renamed field |
| `Prop.TargetHotWaterTemp` | `shotSettings.targetHotWaterTemp` | Direct mapping |
| `Prop.TargetHotWaterVol` | `shotSettings.targetHotWaterVolume` | Direct mapping |
| `Prop.TargetHotWaterLength` | `shotSettings.targetHotWaterDuration` | Renamed field |

### WebSocket Data Model

| Legacy Model | R1 API Model | Translation Notes |
|--------------|--------------|------------------|
| Custom WebSocket frame format with `ChunkType` | Standard JSON messages | `wsStream.ts` handles translation |
| `wsState` enum (Opening, Open, Closed) | Connection status strings | Mapped in data store |

## 2. Transformer Functions Analysis

### `stateTransformers.ts` Functions

#### 1. `machineStateToProperties(machineState: MachineState | null): Partial<Record<Prop, any>>`

- **Purpose**: Converts R1 machine state to legacy Properties format
- **Input**: R1 `MachineState` object or null
- **Output**: Legacy `Properties` partial record
- **Complexity**: High - Contains complex conditional logic and mapping table
- **Recommendation**: **Replace with direct access**. UI components should be updated to use R1 state directly.

#### 2. `scaleSnapshotToProperties(scaleSnapshot: ScaleSnapshot | null): Partial<Record<Prop, any>>`

- **Purpose**: Maps scale weight to legacy property
- **Input**: R1 `ScaleSnapshot` object or null
- **Output**: Legacy property with weight
- **Complexity**: Low - Simple mapping
- **Recommendation**: **Eliminate**. UI components should read scale data directly from R1 model.

#### 3. `shotSettingsToProperties(shotSettings: ShotSettings | null): Partial<Record<Prop, any>>`

- **Purpose**: Converts R1 shot settings to legacy properties
- **Input**: R1 `ShotSettings` object or null
- **Output**: Legacy properties for shot settings
- **Complexity**: Medium - Multiple field mappings
- **Recommendation**: **Eliminate**. UI components should use R1 shot settings directly.

#### 4. `waterLevelsToProperties(waterLevels: { currentPercentage: number; warningThresholdPercentage: number } | null): Partial<Record<Prop, any>>`

- **Purpose**: Converts R1 water levels to legacy properties
- **Input**: R1 water levels object or null
- **Output**: Legacy properties for water levels
- **Complexity**: Low - Simple percentage conversion
- **Recommendation**: **Eliminate**. UI components should use R1 water level data directly.

#### 5. `connectionStatusToRemoteState(connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'): Record<string, any>`

- **Purpose**: Maps R1 connection status to legacy RemoteState
- **Input**: R1 connection status string
- **Output**: Legacy RemoteState partial object
- **Complexity**: Low - Simple conditional mapping
- **Recommendation**: **Eliminate**. UI components should consume connection status directly from R1.

### `restTransformers.ts` Functions

#### 1. `transformR1DeviceToDevice(r1Device: any): Device`

- **Purpose**: Converts R1 device data to application's Device format
- **Input**: R1 device data object
- **Output**: Application `Device` model
- **Complexity**: Low - Simple field mapping
- **Recommendation**: **Keep with simplification**. Ensure Device model aligns with R1 format but maintain for type safety.

#### 2. `transformR1MachineStateToMachineState(r1Data: any): MachineState`

- **Purpose**: Maps R1 machine state to application's MachineState model
- **Input**: R1 machine state data
- **Output**: Application `MachineState` model
- **Complexity**: Medium - Multiple field mappings
- **Recommendation**: **Refactor to align models**. Update application MachineState to match R1 format more closely.

#### 3. `transformR1ScaleToScale(r1Scale: any): Scale`

- **Purpose**: Converts R1 scale data to application's Scale model
- **Input**: R1 scale data
- **Output**: Application `Scale` model
- **Complexity**: Low - Simple field mapping
- **Recommendation**: **Keep with simplification**. Ensure Scale model aligns with R1 format but maintain for type safety.

#### 4. `transformR1ShotSettingsToShotSettings(r1Settings: any): ShotSettings`

- **Purpose**: Converts R1 shot settings to application's format
- **Input**: R1 shot settings data
- **Output**: Application `ShotSettings` model
- **Complexity**: Medium - Multiple field mappings
- **Recommendation**: **Refactor to align models**. Update application ShotSettings to match R1 format more closely.

#### 5. `transformShotSettingsToR1ShotSettings(settings: ShotSettings): any`

- **Purpose**: Converts application's ShotSettings to R1 format
- **Input**: Application `ShotSettings` model
- **Output**: R1 shot settings data
- **Complexity**: Medium - Multiple field mappings
- **Recommendation**: **Refactor to align models**. Update application ShotSettings to match R1 format more closely.

#### 6. `transformProfileToR1Profile(profile: Profile): any`

- **Purpose**: Converts application's Profile to R1 format
- **Input**: Application `Profile` model
- **Output**: R1 profile data
- **Complexity**: High - Complex profile structure mapping
- **Recommendation**: **Keep with improvements**. Profiles are complex and require careful mapping, but can be simplified.

#### 7. `transformR1ProfileToProfile(r1Profile: any): Profile`

- **Purpose**: Converts R1 profile data to application's Profile format
- **Input**: R1 profile data
- **Output**: Application `Profile` model
- **Complexity**: High - Complex profile structure mapping
- **Recommendation**: **Keep with improvements**. Profiles are complex and require careful mapping, but can be simplified.

### `websocketTransformers.ts` Functions

#### 1. `transformR1MachineSnapshotToMachineState(r1Data: any): MachineState`

- **Purpose**: Converts real-time R1 machine data to MachineState
- **Input**: R1 machine snapshot data
- **Output**: Application `MachineState` model
- **Complexity**: Medium - Similar to REST transformer but for WebSocket data
- **Recommendation**: **Refactor to align models**. Update application MachineState to match R1 format more closely.

#### 2. `transformR1ScaleSnapshotToScale(r1Data: any): ScaleSnapshot`

- **Purpose**: Converts real-time R1 scale data to ScaleSnapshot
- **Input**: R1 scale snapshot data
- **Output**: Application `ScaleSnapshot` model
- **Complexity**: Low - Simple field mapping
- **Recommendation**: **Keep with simplification**. Ensure ScaleSnapshot model aligns with R1 format but maintain for type safety.

#### 3. `transformR1ShotSettingsToShotSettings(r1Data: any): any`

- **Purpose**: Converts real-time R1 shot settings to application format
- **Input**: R1 shot settings WebSocket data
- **Output**: Application shot settings format
- **Complexity**: Medium - Multiple field mappings
- **Recommendation**: **Refactor to align models**. Update application shot settings to match R1 format more closely.

#### 4. `transformR1WaterLevelsToWaterLevels(r1Data: any): any`

- **Purpose**: Converts real-time R1 water levels to application format
- **Input**: R1 water levels WebSocket data
- **Output**: Application water levels format
- **Complexity**: Low - Simple percentage conversion
- **Recommendation**: **Keep with simplification**. Ensure water levels model aligns with R1 format.

#### 5. `transformR1WebSocketData(endpointType: string, data: any): any`

- **Purpose**: General-purpose data transformation based on WebSocket endpoint
- **Input**: Endpoint type and R1 WebSocket data
- **Output**: Transformed data based on endpoint type
- **Complexity**: Medium - Routing to specific transformers
- **Recommendation**: **Refactor to simplify**. As other transformers are simplified, this can be streamlined or eliminated.

## 3. State Sync Mechanism Analysis

The core translation mechanism `syncR1StateToLegacyState()` in the data store performs several key functions:

1. Aggregates transformed data from multiple sources:
   - Shot settings (from `shotSettingsToProperties`)
   - Scale snapshot (from `scaleSnapshotToProperties`)
   - Machine state (from `machineStateToProperties`)
   - Water levels (from `waterLevelsToProperties`)

2. Ensures timestamp updates for UI refresh

3. Sets machine state properties critical for timer functionality

4. Updates remote state based on connection status

**Recommendation**: This function should be completely eliminated. Instead:

1. UI components should be updated to directly consume R1 data structures
2. Timer functionality should be reimplemented to work with R1 state directly
3. Connection status handling should be simplified to work directly with R1 status

## 4. Model Alignment Strategy

To eliminate the translation layer, these steps should be followed:

1. **Define New Core Models**:
   - Create or update TypeScript interfaces that directly match R1 API structures
   - Use type safety to ensure proper usage throughout the application

2. **Update State Store**:
   - Remove legacy state properties from the store interface
   - Store R1 data structures directly without translation
   - Update selectors and derived state to work with R1 models

3. **Update UI Components**:
   - Modify components to consume R1 data structures directly
   - Update prop types to reflect R1 model structure
   - Remove any references to legacy properties

4. **Simplify Adapter Layer**:
   - Keep minimal transformations only for type safety and consistency
   - Focus on mapping between any strings/enums that need explicit handling
   - Remove all transformations that convert between structurally different models

## 5. Summary of Recommendations

| Component | Recommendation |
|-----------|----------------|
| `stateTransformers.ts` | **Eliminate entirely** - Replace with direct R1 data usage |
| REST API adapters | **Simplify significantly** - Keep minimal type conversion only |
| WebSocket handlers | **Simplify significantly** - Remove translation to legacy format |
| `syncR1StateToLegacyState` | **Eliminate entirely** - Core mechanism for legacy compatibility |
| Type definitions | **Replace** - Create new types that match R1 API structure |
| UI components | **Update** - Modify to consume R1 data structures directly |

By implementing these recommendations, the codebase will be significantly simplified, removing the translation layers while maintaining functionality and type safety. 