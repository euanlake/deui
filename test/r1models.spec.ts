import { 
  isMachineOn, 
  getMajorState, 
  getMinorState 
} from '../src/shared/r1models';
import { MachineState } from '../src/api/models/Machine';

describe('R1 Model Helper Functions', () => {
  describe('isMachineOn', () => {
    it('should return false for null machine state', () => {
      expect(isMachineOn(null)).toBe(false);
    });
    
    it('should return false for sleep state', () => {
      const sleepState: MachineState = {
        id: 'machine1',
        state: 'sleep',
        substate: null,
        current_temperature: 25.0,
        target_temperature: 0,
        enabled_features: []
      };
      expect(isMachineOn(sleepState)).toBe(false);
    });
    
    it('should return true for non-sleep states', () => {
      const states: MachineState['state'][] = ['idle', 'espresso', 'steam', 'hotwater', 'flush'];
      
      states.forEach(state => {
        const machineState: MachineState = {
          id: 'machine1',
          state,
          substate: null,
          current_temperature: 90.0,
          target_temperature: 93.0,
          enabled_features: []
        };
        expect(isMachineOn(machineState)).toBe(true);
      });
    });
  });
  
  describe('getMajorState', () => {
    it('should return 0 for null machine state', () => {
      expect(getMajorState(null)).toBe(0);
    });
    
    it('should return the correct major state for each machine state', () => {
      const stateMap: Record<MachineState['state'], number> = {
        'sleep': 0,
        'idle': 0,
        'espresso': 4,
        'steam': 2,
        'hotwater': 3,
        'flush': 11
      };
      
      Object.entries(stateMap).forEach(([state, expectedValue]) => {
        const machineState: MachineState = {
          id: 'machine1',
          state: state as MachineState['state'],
          substate: null,
          current_temperature: 90.0,
          target_temperature: 93.0,
          enabled_features: []
        };
        expect(getMajorState(machineState)).toBe(expectedValue);
      });
    });
  });
  
  describe('getMinorState', () => {
    it('should return 0 for null machine state', () => {
      expect(getMinorState(null)).toBe(0);
    });
    
    it('should return the correct minor state for espresso substate', () => {
      // Test preinfusion
      const preinfusionState: MachineState = {
        id: 'machine1',
        state: 'espresso',
        substate: 'preinfusion',
        current_temperature: 90.0,
        target_temperature: 93.0,
        enabled_features: []
      };
      expect(getMinorState(preinfusionState)).toBe(1);
      
      // Test pour
      const pourState: MachineState = {
        id: 'machine1',
        state: 'espresso',
        substate: 'pour',
        current_temperature: 90.0,
        target_temperature: 93.0,
        enabled_features: []
      };
      expect(getMinorState(pourState)).toBe(2);
    });
    
    it('should return the correct minor state for steam substate', () => {
      const steamingState: MachineState = {
        id: 'machine1',
        state: 'steam',
        substate: 'steaming',
        current_temperature: 120.0,
        target_temperature: 125.0,
        enabled_features: []
      };
      expect(getMinorState(steamingState)).toBe(5);
    });
    
    it('should return the correct minor state for hotwater substate', () => {
      const hotWaterState: MachineState = {
        id: 'machine1',
        state: 'hotwater',
        substate: 'pouring',
        current_temperature: 90.0,
        target_temperature: 93.0,
        enabled_features: []
      };
      expect(getMinorState(hotWaterState)).toBe(2);
    });
    
    it('should return the correct minor state for flush state', () => {
      const flushState: MachineState = {
        id: 'machine1',
        state: 'flush',
        substate: null,
        current_temperature: 90.0,
        target_temperature: 93.0,
        enabled_features: []
      };
      expect(getMinorState(flushState)).toBe(4);
    });
    
    it('should return 0 for unknown state/substate combinations', () => {
      const unknownState: MachineState = {
        id: 'machine1',
        state: 'idle',
        substate: 'unknown',
        current_temperature: 90.0,
        target_temperature: 93.0,
        enabled_features: []
      };
      expect(getMinorState(unknownState)).toBe(0);
    });
  });
}); 