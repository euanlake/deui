import { WebSocketApi } from '../../interfaces/WebSocketApi';
import { WebSocketConnection } from '../../interfaces/WebSocketConnection';
import { R1WebSocketConnection } from './R1WebSocketConnection';

/**
 * WebSocket adapter for R1's WebSocket endpoints
 * Handles connection to the different WebSocket streams provided by R1
 */
export class R1WebSocketAdapter implements WebSocketApi {
  private readonly baseUrl: string;
  private readonly websocketUrl: string;
  
  // Keep track of active connections
  private activeConnections: Map<string, WebSocketConnection> = new Map();
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Convert HTTP URL to WebSocket URL
    this.websocketUrl = baseUrl.replace(/^http/, 'ws');
  }

  /**
   * Get a WebSocket connection for the DE1 machine snapshot data
   * This endpoint provides real-time updates about machine state, pressure, flow, etc.
   */
  connectToMachineSnapshot(): WebSocketConnection {
    const endpoint = '/ws/v1/de1/snapshot';
    return this.getOrCreateConnection(endpoint);
  }

  /**
   * Get a WebSocket connection for shot settings updates
   * This endpoint may not be directly available in R1 but we provide fallback handling
   */
  connectToShotSettings(): WebSocketConnection {
    const endpoint = '/ws/v1/de1/shotSettings';
    
    try {
      return this.getOrCreateConnection(endpoint);
    } catch (error) {
      console.warn('Shot settings WebSocket not supported by R1:', error);
      return this.createMockWebSocketConnection();
    }
  }

  /**
   * Get a WebSocket connection for water levels updates
   * This endpoint may not be directly available in R1 but we provide fallback handling
   */
  connectToWaterLevels(): WebSocketConnection {
    const endpoint = '/ws/v1/de1/waterLevels';
    
    try {
      return this.getOrCreateConnection(endpoint);
    } catch (error) {
      console.warn('Water levels WebSocket not supported by R1:', error);
      return this.createMockWebSocketConnection();
    }
  }

  /**
   * Get a WebSocket connection for scale weight updates
   * This endpoint provides real-time weight measurements from connected scales
   */
  connectToScaleSnapshot(): WebSocketConnection {
    const endpoint = '/ws/v1/scale/snapshot';
    return this.getOrCreateConnection(endpoint);
  }

  /**
   * Helper method to get an existing connection or create a new one
   * This prevents creating duplicate connections to the same endpoint
   */
  private getOrCreateConnection(endpoint: string): WebSocketConnection {
    const url = `${this.websocketUrl}${endpoint}`;
    console.log(`Getting or creating connection to: ${url}`);
    
    if (!this.activeConnections.has(url)) {
      console.log(`Creating new connection to: ${url}`);
      const connection = new R1WebSocketConnection(url);
      
      // Add close handler to remove connection from active connections when closed
      const originalClose = connection.close.bind(connection);
      connection.close = () => {
        console.log(`Closing connection to: ${url}`);
        originalClose();
        this.activeConnections.delete(url);
      };
      
      // Store the connection
      this.activeConnections.set(url, connection);
    } else {
      console.log(`Reusing existing connection to: ${url}`);
    }
    
    return this.activeConnections.get(url)!;
  }

  /**
   * Create a mock WebSocket connection for endpoints that are not available in R1
   * This allows our application to still function even if some features are missing
   */
  private createMockWebSocketConnection(): WebSocketConnection {
    return {
      onMessage: () => {},
      onError: () => {},
      onClose: () => {},
      close: () => {}
    };
  }
  
  /**
   * Close all active connections
   * This should be called when the application is shutting down or disconnecting
   */
  closeAll(): void {
    for (const connection of this.activeConnections.values()) {
      connection.close();
    }
    this.activeConnections.clear();
  }
} 