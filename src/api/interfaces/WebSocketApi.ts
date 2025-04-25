import { WebSocketConnection } from './WebSocketConnection';

export interface WebSocketApi {
  connectToMachineSnapshot(): WebSocketConnection;
  connectToShotSettings(): WebSocketConnection;
  connectToWaterLevels(): WebSocketConnection;
  connectToScaleSnapshot(): WebSocketConnection;
} 