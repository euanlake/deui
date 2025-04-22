import { WebSocketConnection } from '../../interfaces/WebSocketConnection';
import { transformR1WebSocketData } from '../../transformers/websocketTransformers';

export class R1WebSocketConnection implements WebSocketConnection {
  private websocket: WebSocket | null = null;
  private messageCallback: ((data: any) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private closeCallback: (() => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any = null;
  private endpointType: 'machine' | 'scale' | 'shotSettings' | 'waterLevels';
  
  constructor(private url: string) {
    this.endpointType = this.determineEndpointType(url);
    this.connect();
  }
  
  private determineEndpointType(url: string): 'machine' | 'scale' | 'shotSettings' | 'waterLevels' {
    if (url.includes('/de1/snapshot')) return 'machine';
    if (url.includes('/scale/snapshot')) return 'scale';
    if (url.includes('/de1/shotSettings')) return 'shotSettings';
    if (url.includes('/de1/waterLevels')) return 'waterLevels';
    
    // Default to machine if we can't determine
    return 'machine';
  }
  
  private connect(): void {
    try {
      this.websocket = new WebSocket(this.url);
      
      this.websocket.addEventListener('open', this.handleOpen.bind(this));
      this.websocket.addEventListener('message', this.handleMessage.bind(this));
      this.websocket.addEventListener('error', this.handleError.bind(this));
      this.websocket.addEventListener('close', this.handleClose.bind(this));
    } catch (error) {
      console.error(`Error creating WebSocket connection to ${this.url}:`, error);
      if (this.errorCallback) {
        this.errorCallback(new Error(`Failed to create WebSocket connection: ${error}`));
      }
    }
  }
  
  private handleOpen(event: Event): void {
    console.log(`WebSocket connection established to ${this.url}`);
    // Reset reconnect attempts on successful connection
    this.reconnectAttempts = 0;
  }
  
  private handleMessage(event: MessageEvent): void {
    if (!this.messageCallback) return;
    
    try {
      // Parse the JSON data from the message
      const data = JSON.parse(event.data);
      
      // Transform the data using our transformer functions
      const transformedData = transformR1WebSocketData(this.endpointType, data);
      
      // Pass the transformed data to the callback
      this.messageCallback(transformedData);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error, event.data);
      
      // Try to send the raw data if parsing fails
      if (this.messageCallback && event.data) {
        this.messageCallback(event.data);
      }
    }
  }
  
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    if (this.errorCallback) {
      this.errorCallback(new Error('WebSocket connection error'));
    }
  }
  
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    
    // Clean up the current connection
    this.websocket = null;
    
    // Attempt to reconnect if not closed intentionally and within reconnect limits
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    } else if (this.closeCallback) {
      this.closeCallback();
    }
  }
  
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) after ${delay}ms...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  onMessage(callback: (data: any) => void): void {
    this.messageCallback = callback;
  }
  
  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
  
  onClose(callback: () => void): void {
    this.closeCallback = callback;
  }
  
  close(): void {
    // Clear any pending reconnect attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.websocket) {
      // Prevent reconnection attempts for intentional close
      this.reconnectAttempts = this.maxReconnectAttempts;
      
      try {
        this.websocket.close(1000, 'Connection closed by client');
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      
      this.websocket = null;
    }
    
    if (this.closeCallback) {
      this.closeCallback();
    }
  }
} 