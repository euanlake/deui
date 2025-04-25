import { WebSocketConnection } from '../../interfaces/WebSocketConnection';
import { transformR1WebSocketData } from '../../transformers/websocketTransformers';
import { ErrorCategory, handleR1Error, getUserFriendlyErrorMessage, R1Error } from '../../utils/errorHandling';

export class R1WebSocketConnection implements WebSocketConnection {
  private websocket: WebSocket | null = null;
  private messageCallback: ((data: any) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private closeCallback: (() => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any = null;
  private endpointType: 'machine' | 'scale' | 'shotSettings' | 'waterLevels';
  private isIntentionalClose = false;
  
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
      // Don't attempt to connect if there was an intentional close
      if (this.isIntentionalClose) return;

      this.websocket = new WebSocket(this.url);
      
      this.websocket.addEventListener('open', this.handleOpen.bind(this));
      this.websocket.addEventListener('message', this.handleMessage.bind(this));
      this.websocket.addEventListener('error', this.handleError.bind(this));
      this.websocket.addEventListener('close', this.handleClose.bind(this));
    } catch (error) {
      console.error(`Error creating WebSocket connection to ${this.url}:`, error);
      
      // Process the error through our utility with R1-specific context
      const appError = handleR1Error({
        message: `Failed to create WebSocket connection: ${error}`,
        category: ErrorCategory.CONNECTION,
        code: 'connection.websocket',
        originalError: {
          error,
          url: this.url,
          endpointType: this.endpointType
        }
      });
      
      if (this.errorCallback) {
        this.errorCallback(new Error(appError.message));
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
      // Log raw data for debugging
      console.log(`Raw WebSocket data (${this.endpointType}):`, event.data);
      
      // Parse the JSON data from the message
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (parseError) {
        console.error(`Error parsing WebSocket JSON for ${this.endpointType}:`, parseError);
        console.log(`Raw data that couldn't be parsed:`, event.data);
        
        // Try to recover if data is not valid JSON
        if (typeof event.data === 'string') {
          // If it's just a string, use it directly
          data = { raw: event.data, timestamp: new Date().toISOString() };
        } else {
          // If it's already an object, use it as is
          data = event.data;
        }
      }
      
      console.log(`Parsed WebSocket data (${this.endpointType}):`, data);
      
      // Transform the data using our transformer functions
      const transformedData = transformR1WebSocketData(this.endpointType, data);
      
      console.log(`Transformed data (${this.endpointType}):`, transformedData);
      
      // Pass the transformed data to the callback
      this.messageCallback(transformedData);
    } catch (error) {
      console.error('Error handling WebSocket message:', error, event.data);
      
      // Generate endpoint-specific error code based on the type of stream
      let errorCode: string;
      switch (this.endpointType) {
        case 'machine':
          errorCode = 'machine.websocket.snapshot';
          break;
        case 'scale':
          errorCode = 'scale.websocket.snapshot';
          break;
        case 'shotSettings':
          errorCode = 'machine.websocket.shot_settings';
          break;
        case 'waterLevels':
          errorCode = 'machine.websocket.water_levels';
          break;
        default:
          errorCode = 'connection.websocket.parse_error';
      }
      
      // Process the error using our utility with more context
      const appError = handleR1Error({
        message: `Error parsing WebSocket message: ${error}`,
        originalData: event.data,
        category: this.getCategoryFromEndpointType(),
        code: errorCode,
        originalError: {
          error,
          url: this.url,
          endpointType: this.endpointType
        }
      });
      
      // Try to send the raw data if parsing fails to maintain functionality
      if (this.messageCallback && event.data) {
        // Log the error for debugging
        console.warn(`WebSocket data parsing error: ${appError.message}`);
        
        try {
          // Attempt to salvage what we can from the data
          const fallbackData = typeof event.data === 'string' ? 
            { raw: event.data, timestamp: new Date().toISOString() } : 
            event.data;
            
          this.messageCallback(fallbackData);
        } catch (innerError) {
          console.error('Failed to process fallback data:', innerError);
        }
      }
      
      // Also notify error callback
      if (this.errorCallback) {
        this.errorCallback(new Error(appError.message));
      }
    }
  }
  
  /**
   * Map endpoint type to error category for more specific error handling
   */
  private getCategoryFromEndpointType(): ErrorCategory {
    switch (this.endpointType) {
      case 'machine':
      case 'shotSettings':
      case 'waterLevels':
        return ErrorCategory.MACHINE;
      case 'scale':
        return ErrorCategory.SCALE;
      default:
        return ErrorCategory.CONNECTION;
    }
  }
  
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    
    // Generate specific error code based on endpoint type
    let errorCode: string;
    switch (this.endpointType) {
      case 'machine':
        errorCode = 'machine.websocket.snapshot';
        break;
      case 'scale':
        errorCode = 'scale.websocket.snapshot';
        break;
      case 'shotSettings':
        errorCode = 'machine.websocket.shot_settings';
        break;
      case 'waterLevels':
        errorCode = 'machine.websocket.water_levels';
        break;
      default:
        errorCode = 'connection.websocket';
    }
    
    // Process the error using our utility with enhanced context
    const appError = handleR1Error({
      message: `WebSocket connection error for ${this.endpointType} stream`,
      originalEvent: event,
      category: this.getCategoryFromEndpointType(),
      code: errorCode,
      originalError: {
        event,
        url: this.url,
        endpointType: this.endpointType
      }
    });
    
    if (this.errorCallback) {
      this.errorCallback(new Error(appError.message));
    }
  }
  
  private handleClose(event: CloseEvent): void {
    const closeReason = event.reason || (event.code === 1000 ? 'Normal closure' : `Code: ${event.code}`);
    console.log(`WebSocket connection closed: ${closeReason}`);
    
    // Clean up the current connection
    this.websocket = null;
    
    // Check for R1-specific close codes that might indicate different issues
    let isFatalError = false;
    let specificError: R1Error | null = null;
    
    // Specific handling for different close codes
    if (event.code === 1006) {
      // Abnormal closure - likely network issue or server crashed
      specificError = handleR1Error({
        message: 'WebSocket connection lost abnormally',
        category: ErrorCategory.CONNECTION,
        code: 'connection.websocket.closed',
        originalError: event
      });
    } else if (event.code === 1001) {
      // Going away - server is shutting down
      specificError = handleR1Error({
        message: 'R1 server is shutting down or restarting',
        category: ErrorCategory.CONNECTION,
        code: 'connection.websocket.closed',
        originalError: event
      });
    } else if (event.code === 1011) {
      // Internal server error
      specificError = handleR1Error({
        message: 'R1 server encountered an internal error',
        category: ErrorCategory.GENERAL,
        code: 'general.server_error',
        originalError: event
      });
      isFatalError = true; // Don't retry on server errors
    }
    
    // Notify about the specific error if we identified one
    if (specificError && this.errorCallback) {
      this.errorCallback(new Error(specificError.message));
    }
    
    // Determine if this is an error condition that should be retried
    const shouldAttemptReconnect = 
      !this.isIntentionalClose &&
      !isFatalError &&
      this.reconnectAttempts < this.maxReconnectAttempts && 
      event.code !== 1000; // Don't reconnect on normal closure
    
    if (shouldAttemptReconnect) {
      this.attemptReconnect();
    } else if (this.closeCallback) {
      this.closeCallback();
    }
  }
  
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) after ${delay}ms...`);
    
    const isLastAttempt = this.reconnectAttempts === this.maxReconnectAttempts;
    const code = isLastAttempt ? 'connection.reconnect.failed' : 'connection.reconnect';
    
    // Process and notify about reconnection attempt with specific context
    if (this.errorCallback) {
      const appError = handleR1Error({
        message: isLastAttempt 
          ? `Final reconnection attempt to ${this.endpointType} stream` 
          : `WebSocket disconnected. Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`,
        category: ErrorCategory.CONNECTION,
        code,
        originalError: {
          url: this.url,
          endpointType: this.endpointType,
          reconnectAttempt: this.reconnectAttempts,
          maxReconnectAttempts: this.maxReconnectAttempts
        }
      });
      
      this.errorCallback(new Error(appError.message));
    }
    
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
    // Mark this as an intentional close to prevent reconnection
    this.isIntentionalClose = true;
    
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
        
        // Process the error using our utility
        const appError = handleR1Error({
          message: `Error closing WebSocket: ${error}`,
          category: ErrorCategory.CONNECTION,
          code: 'connection.websocket',
          originalError: {
            error,
            url: this.url,
            endpointType: this.endpointType
          }
        });
        
        if (this.errorCallback) {
          this.errorCallback(new Error(appError.message));
        }
      }
      
      this.websocket = null;
    }
    
    if (this.closeCallback) {
      this.closeCallback();
    }
  }
} 