import { MachineState, MachineStateType } from "$/shared/r1models";
import { useDataStore } from "$/stores/data";

/**
 * Map current state to the expected API state values
 * 
 * @param machineState The current machine state
 * @returns The API-compatible state string to toggle to
 */
function getTargetState(machineState: MachineState | null): MachineStateType {
  if (!machineState) return "idle"; // Default to idle if no state
  
  // If currently sleeping, wake up to idle
  if (machineState.state === "sleep" || 
      machineState.state === "sleeping@api_v1.md" || 
      machineState.state.startsWith("sleep")) {
    return "idle";
  }
  
  // Otherwise go to sleep
  return "sleep";
}

/**
 * React hook to get the machine state toggle function
 */
export function useMachineStateToggle() {
  const { setMachineState } = useDataStore();
  
  return {
    toggleMachineOnOff: async (currentState: MachineState | null) => {
      if (!currentState) {
        console.warn("Cannot toggle machine state: unknown current state");
        return;
      }
      
      const newState = getTargetState(currentState);
      console.log(`Toggling machine state from ${currentState.state} to ${newState}`);
      
      await setMachineState(newState);
    }
  };
} 