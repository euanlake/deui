import { WebSocketConnection } from '../../interfaces/WebSocketConnection';
import { MachineState } from '../../models/Machine';
import { ScaleSnapshot } from '../../models/Scale';

export class MockWebSocketConnection implements WebSocketConnection {
  private intervalId: number | null = null;
  private onMessageCallback: ((data: any) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  
  constructor(
    private readonly type: 'machine' | 'shotSettings' | 'waterLevels' | 'scale',
    private readonly interval: number
  ) {}
  
  onMessage(callback: (data: any) => void): void {
    this.onMessageCallback = callback;
    
    // Simulate connection established
    setTimeout(() => {
      // Start sending mock data
      this.intervalId = window.setInterval(() => {
        if (this.onMessageCallback) {
          this.onMessageCallback(this.generateMockData());
        }
      }, this.interval);
    }, 100);
  }
  
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }
  
  onClose(callback: () => void): void {
    this.onCloseCallback = callback;
  }
  
  close(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }
  
  private generateMockData(): any {
    const timestamp = new Date().toISOString();
    
    switch (this.type) {
      case 'machine':
        return this.generateMachineMockData(timestamp);
      case 'shotSettings':
        return this.generateShotSettingsMockData();
      case 'waterLevels':
        return this.generateWaterLevelsMockData();
      case 'scale':
        return this.generateScaleMockData(timestamp);
      default:
        return {};
    }
  }
  
  private generateMachineMockData(timestamp: string): Partial<MachineState> {
    // Generate some simulated machine data with small changes
    return {
      timestamp,
      flow: 2 + (Math.random() * 0.4 - 0.2),
      pressure: 9 + (Math.random() * 0.6 - 0.3),
      mixTemperature: 93 + (Math.random() * 0.4 - 0.2),
      groupTemperature: 93.5 + (Math.random() * 0.2 - 0.1)
    };
  }
  
  private generateShotSettingsMockData(): any {
    return {
      steamSetting: 1,
      targetSteamTemp: 150,
      targetSteamDuration: 30,
      targetHotWaterTemp: 90,
      targetHotWaterVolume: 250,
      targetHotWaterDuration: 15,
      targetShotVolume: 30,
      groupTemp: 93.0
    };
  }
  
  private generateWaterLevelsMockData(): any {
    return {
      currentPercentage: 80 - (Math.random() * 0.2),
      warningThresholdPercentage: 20
    };
  }
  
  private generateScaleMockData(timestamp: string): ScaleSnapshot {
    // Simulate a slowly increasing weight (like during a shot)
    const mockWeight = (Date.now() % 30000) / 1000; // Increases over 30 seconds, then resets
    
    return {
      timestamp,
      weight: mockWeight,
      batteryLevel: 80
    };
  }
} 