import { WebSocketApi } from '../../interfaces/WebSocketApi';
import { WebSocketConnection } from '../../interfaces/WebSocketConnection';
import { MockWebSocketConnection } from './MockWebSocketConnection';

export class MockWebSocketAdapter implements WebSocketApi {
  connectToMachineSnapshot(): WebSocketConnection {
    return new MockWebSocketConnection('machine', 500);
  }
  
  connectToShotSettings(): WebSocketConnection {
    return new MockWebSocketConnection('shotSettings', 2000);
  }
  
  connectToWaterLevels(): WebSocketConnection {
    return new MockWebSocketConnection('waterLevels', 3000);
  }
  
  connectToScaleSnapshot(): WebSocketConnection {
    return new MockWebSocketConnection('scale', 100);
  }
} 