import { ScaleApi } from '../../interfaces/ScaleApi';
import { Scale } from '../../models/Scale';

export class MockScaleAdapter implements ScaleApi {
  private selectedScale: Scale | null = {
    id: 'mock-scale',
    name: 'Mock Decent Scale',
    type: 'scale',
    connectionState: 'connected',
    batteryLevel: 100
  };
  
  async tare(): Promise<void> {
    console.log('Mock taring scale');
  }
  
  async getSelectedScale(): Promise<Scale | null> {
    return this.selectedScale;
  }
  
  async getScales(): Promise<Scale[]> {
    return [
      {
        id: 'mock-scale',
        name: 'Mock Decent Scale',
        type: 'scale',
        connectionState: 'connected',
        batteryLevel: 100
      },
      {
        id: 'mock-scale-2',
        name: 'Mock Felicita Arc Scale',
        type: 'scale',
        connectionState: 'connected',
        batteryLevel: 90
      }
    ];
  }
  
  async selectScale(scaleId: string): Promise<void> {
    console.log(`Mock selecting scale with ID: ${scaleId}`);
    
    if (scaleId === 'mock-scale') {
      this.selectedScale = {
        id: 'mock-scale',
        name: 'Mock Decent Scale',
        type: 'scale',
        connectionState: 'connected',
        batteryLevel: 100
      };
    } else if (scaleId === 'mock-scale-2') {
      this.selectedScale = {
        id: 'mock-scale-2',
        name: 'Mock Felicita Arc Scale',
        type: 'scale',
        connectionState: 'connected',
        batteryLevel: 90
      };
    } else {
      throw new Error(`Scale with ID ${scaleId} not found`);
    }
  }
} 