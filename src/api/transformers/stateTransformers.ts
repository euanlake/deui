import { MachineState, ShotSettings } from '../../api/models/Machine'
import { ScaleSnapshot } from '../../api/models/Scale'
import { getMajorState, getMinorState } from '../../shared/r1models'

// No legacy transformation functions needed as we're exclusively using R1 API models
// The helper functions below may be used by utils or tests if needed

/**
 * Get machine state information from R1 state format
 * @param machineState Machine state from R1 API
 * @returns Major and minor state information
 */
export function getMachineStateInfo(machineState: MachineState | null) {
  if (!machineState) return { majorState: undefined, minorState: undefined }
  
  return {
    majorState: getMajorState(machineState),
    minorState: getMinorState(machineState)
  }
} 