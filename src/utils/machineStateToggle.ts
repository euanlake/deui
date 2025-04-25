import { MajorState } from "$/shared/types";
import { useServerUrl } from "$/hooks";

/**
 * Map MajorState to the expected API state values
 * 
 * @param state MajorState enum value
 * @returns The API-compatible state string
 */
function mapStateToApiValue(state: MajorState): string {
  switch (state) {
    case MajorState.Idle:
      return "sleeping"; // When in Idle, we want to go to sleep
    case MajorState.Sleep:
      return "idle";  // When in Sleep, we want to wake up to idle
    default:
      return "idle";  // Default to idle for safety
  }
}

/**
 * Toggle machine state between on (idle) and off (sleeping)
 * 
 * @param currentMajorState The current MajorState of the machine
 * @param baseUrl The API base URL
 * @returns Promise that resolves when the state change request is complete
 */
export async function toggleMachineOnOff(currentMajorState: MajorState, baseUrl: string): Promise<void> {
  try {
    // Map the current state to the desired new state
    const newState = mapStateToApiValue(currentMajorState);
    
    // Parse the baseUrl to ensure it's properly formatted with protocol and port
    let fullUrl = baseUrl;
    
    // Ensure the URL has a protocol
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `http://${fullUrl}`;
    }
    
    // Parse the URL
    const urlObj = new URL(fullUrl);
    
    // Ensure port is set - if not explicitly in URL, default to 8080
    if (!urlObj.port) {
      urlObj.port = '8080';
    }
    
    // Construct the full API endpoint URL
    const apiUrl = `${urlObj.protocol}//${urlObj.hostname}:${urlObj.port}/api/v1/de1/state/${newState}`;
    
    console.log(`Toggling machine state from ${MajorState[currentMajorState]} to ${newState}`);
    console.log(`Using API URL: ${apiUrl}`);
    
    // Create XMLHttpRequest to avoid CORS preflight issues
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", apiUrl, true);
      
      // Set minimal headers needed for the request
      xhr.setRequestHeader("Accept", "*/*");
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log(`Machine state change successful:`, xhr.status);
          resolve();
        } else {
          console.error(`Request failed with status ${xhr.status}: ${xhr.statusText}`);
          reject(new Error(`Request failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = function() {
        console.error("Network error occurred during state change");
        reject(new Error("Network error occurred"));
      };
      
      // Send empty body as in Postman
      xhr.send();
    });
  } catch (error) {
    console.error('Error toggling machine state:', error);
    throw error;
  }
}

/**
 * React hook to get the machine state toggle function with the server URL already configured
 */
export function useMachineStateToggle() {
  // Get server URL with correct protocol
  const baseUrl = useServerUrl({ protocol: 'http' });
  
  return {
    toggleMachineOnOff: async (currentMajorState: MajorState) => 
      toggleMachineOnOff(currentMajorState, baseUrl)
  };
} 