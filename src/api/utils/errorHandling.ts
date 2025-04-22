import axios from 'axios';
type AxiosError = axios.AxiosError;

/**
 * Error categories to help the application understand the context of errors
 */
export enum ErrorCategory {
  GENERAL = 'general',
  CONNECTION = 'connection',
  DEVICE = 'device',
  MACHINE = 'machine',
  SCALE = 'scale',
  PROFILE = 'profile',
  AUTHENTICATION = 'authentication',
  UNKNOWN = 'unknown'
}

/**
 * Interface for structured error information
 */
export interface ErrorInfo {
  message: string;
  category: ErrorCategory;
  code: string;
  originalError?: any;
  suggestion?: string;
}

/**
 * Custom error class for R1 API errors
 */
export class R1Error extends Error {
  category: ErrorCategory;
  code: string;
  originalError?: any;
  suggestion?: string;

  constructor({ message, category, code, originalError, suggestion }: ErrorInfo) {
    super(message);
    this.name = 'R1Error';
    this.category = category;
    this.code = code;
    this.originalError = originalError;
    this.suggestion = suggestion;
  }
}

/**
 * Map HTTP status codes to user-friendly messages
 */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Please check your input and try again.',
  401: 'Authentication failed. Please sign in again.',
  403: 'You do not have permission to access this resource.',
  404: 'The requested resource was not found.',
  408: 'The request timed out. Please check your connection and try again.',
  409: 'There was a conflict with the current state of the resource.',
  429: 'Too many requests. Please try again later.',
  500: 'An internal server error occurred. Please try again later.',
  502: 'Bad gateway. The server received an invalid response.',
  503: 'Service unavailable. Please try again later.',
  504: 'Gateway timeout. Please check your connection and try again.'
};

/**
 * Map of HTTP status codes to error categories
 */
const HTTP_STATUS_TO_CATEGORY: Record<number, ErrorCategory> = {
  400: ErrorCategory.GENERAL,     // Bad Request
  401: ErrorCategory.AUTHENTICATION, // Unauthorized
  403: ErrorCategory.AUTHENTICATION, // Forbidden
  404: ErrorCategory.GENERAL,     // Not Found
  408: ErrorCategory.CONNECTION,  // Request Timeout
  500: ErrorCategory.GENERAL,     // Internal Server Error
  502: ErrorCategory.CONNECTION,  // Bad Gateway
  503: ErrorCategory.CONNECTION,  // Service Unavailable
  504: ErrorCategory.CONNECTION   // Gateway Timeout
};

/**
 * Map of error keywords/patterns to categories
 */
const ERROR_PATTERN_TO_CATEGORY: Array<[RegExp, ErrorCategory]> = [
  // Connection errors
  [/network error/i, ErrorCategory.CONNECTION],
  [/timeout/i, ErrorCategory.CONNECTION],
  [/econnrefused/i, ErrorCategory.CONNECTION],
  [/unreachable/i, ErrorCategory.CONNECTION],
  [/certificate/i, ErrorCategory.CONNECTION],
  [/ssl/i, ErrorCategory.CONNECTION],
  [/websocket/i, ErrorCategory.CONNECTION],
  [/closed/i, ErrorCategory.CONNECTION],
  
  // Device errors
  [/device not found/i, ErrorCategory.DEVICE],
  [/no.*devices.*found/i, ErrorCategory.DEVICE],
  [/bluetooth/i, ErrorCategory.DEVICE],
  [/ble/i, ErrorCategory.DEVICE],
  [/scan/i, ErrorCategory.DEVICE],
  
  // Machine errors
  [/machine/i, ErrorCategory.MACHINE],
  [/de1/i, ErrorCategory.MACHINE],
  [/state/i, ErrorCategory.MACHINE],
  
  // Scale errors
  [/scale/i, ErrorCategory.SCALE],
  [/weight/i, ErrorCategory.SCALE],
  [/tare/i, ErrorCategory.SCALE],
  
  // Profile errors
  [/profile/i, ErrorCategory.PROFILE],
  [/upload/i, ErrorCategory.PROFILE],
];

/**
 * Map specific error codes to user-friendly messages
 */
const ERROR_CODE_TO_MESSAGE: Record<string, string> = {
  // Connection errors
  'connection.timeout': 'Connection timed out while trying to reach the R1 server.',
  'connection.refused': 'Connection refused. The R1 server is not accepting connections.',
  'connection.network': 'Network error. Check your internet connection.',
  'connection.unreachable': 'R1 server is unreachable.',
  'connection.certificate': 'SSL certificate error. The connection is not secure.',
  'connection.websocket': 'WebSocket connection error.',
  'connection.websocket.closed': 'WebSocket connection closed unexpectedly.',
  'connection.websocket.parse_error': 'Error processing data from the machine.',
  'connection.reconnect': 'Lost connection to the R1 server. Attempting to reconnect...',
  'connection.reconnect.failed': 'Unable to reconnect to the R1 server after multiple attempts.',
  
  // Authentication errors
  'authentication.unauthorized': 'Authentication failed. Please check your credentials.',
  'authentication.forbidden': 'You do not have permission to access this resource.',
  
  // Device errors
  'device.not_found': 'Device not found. Make sure your device is connected and powered on.',
  'device.scan_failed': 'Failed to scan for devices. Please try again.',
  'device.bluetooth_off': 'Bluetooth is turned off. Please enable Bluetooth and try again.',
  'device.connection_failed': 'Failed to connect to the device.',
  
  // Machine errors
  'machine.state_change_failed': 'Failed to change machine state.',
  'machine.state_read_failed': 'Failed to read machine state.',
  'machine.shot_settings_failed': 'Failed to update shot settings.',
  'machine.usb_charging_failed': 'Failed to change USB charging state.',
  
  // Scale errors
  'scale.tare_failed': 'Failed to tare the scale.',
  'scale.read_failed': 'Failed to read data from the scale.',
  'scale.not_connected': 'No scale is connected.',
  
  // Profile errors
  'profile.upload_failed': 'Failed to upload profile.',
  'profile.invalid_format': 'Invalid profile format.',
  'profile.too_large': 'Profile is too large.',
  
  // General errors
  'general.bad_request': 'Bad request. Please check your inputs.',
  'general.not_found': 'The requested resource was not found.',
  'general.server_error': 'R1 server encountered an error.',
  'general.service_unavailable': 'R1 service is currently unavailable.',
  
  // Unknown
  'unknown.error': 'An unknown error occurred.',
  
  // R1 machine-specific WebSocket errors
  'machine.websocket.snapshot': 'Error receiving machine data updates.',
  'machine.websocket.shot_settings': 'Error receiving shot settings updates.',
  'machine.websocket.water_levels': 'Error receiving water level updates.',
  
  // R1 scale-specific WebSocket errors
  'scale.websocket.snapshot': 'Error receiving scale weight updates.',
};

/**
 * Suggestions for different error categories
 */
const CATEGORY_SUGGESTIONS: Record<ErrorCategory, string[]> = {
  [ErrorCategory.CONNECTION]: [
    'Check if the R1 server is running',
    'Verify the hostname and port settings',
    'Check your network connection',
    'Try using a different protocol (HTTP/HTTPS)',
    'Try restarting the application',
    'Check if your firewall is blocking the connection'
  ],
  [ErrorCategory.AUTHENTICATION]: [
    'Verify your username and password',
    'You may need to reconnect to authenticate'
  ],
  [ErrorCategory.DEVICE]: [
    'Make sure your device is powered on',
    'Check if the device is in range',
    'Verify that Bluetooth is enabled',
    'Try scanning for devices again'
  ],
  [ErrorCategory.MACHINE]: [
    'Check if the machine is in standby mode',
    'The machine may need to be restarted',
    'Verify that the machine is properly connected'
  ],
  [ErrorCategory.SCALE]: [
    'Check if the scale is turned on',
    'Verify that the scale is paired with R1',
    'The scale may need new batteries'
  ],
  [ErrorCategory.PROFILE]: [
    'Verify that the profile format is correct',
    'Try simplifying the profile if it is too complex',
    'Check that all required fields are present'
  ],
  [ErrorCategory.GENERAL]: [
    'Try again in a few moments',
    'Restart the R1 server if you have access',
    'Check R1 logs for more information'
  ],
  [ErrorCategory.UNKNOWN]: [
    'Try again in a few moments',
    'Check application logs for more details',
    'Contact support if the issue persists'
  ]
};

/**
 * Determines the error category based on the error
 */
function determineErrorCategory(error: any): ErrorCategory {
  // Check if it's already a categorized error
  if (error instanceof R1Error) {
    return error.category;
  }
  
  // Check for HTTP status code
  const status = error?.response?.status;
  if (status && HTTP_STATUS_TO_CATEGORY[status]) {
    return HTTP_STATUS_TO_CATEGORY[status];
  }
  
  // Check for network errors
  if (error?.code === 'ECONNABORTED' || 
      error?.code === 'ETIMEDOUT' || 
      error?.message?.includes('timeout')) {
    return ErrorCategory.CONNECTION;
  }

  if (error?.code === 'ECONNREFUSED') {
    return ErrorCategory.CONNECTION;
  }
  
  // Check error message against patterns
  const errorMessage = error?.message || '';
  for (const [pattern, category] of ERROR_PATTERN_TO_CATEGORY) {
    if (pattern.test(errorMessage)) {
      return category;
    }
  }
  
  // Check R1-specific error messages
  if (error?.response?.data?.e) {
    const r1ErrorMessage = error.response.data.e;
    for (const [pattern, category] of ERROR_PATTERN_TO_CATEGORY) {
      if (pattern.test(r1ErrorMessage)) {
        return category;
      }
    }
  }
  
  return ErrorCategory.GENERAL;
}

/**
 * Generates an appropriate error code based on the error category and details
 */
function generateErrorCode(category: ErrorCategory, error: any): string {
  // If it's already an R1Error, use its code
  if (error instanceof R1Error) {
    return error.code;
  }
  
  // For HTTP errors, generate a code based on status
  if (error?.response?.status) {
    const status = error.response.status;
    switch (status) {
      case 400: return `${category}.bad_request`;
      case 401: return `${category}.unauthorized`;
      case 403: return `${category}.forbidden`;
      case 404: return `${category}.not_found`;
      case 408: return `${category}.timeout`;
      case 429: return `${category}.rate_limited`;
      case 500: return `${category}.server_error`;
      case 502: return `${category}.bad_gateway`;
      case 503: return `${category}.service_unavailable`;
      case 504: return `${category}.gateway_timeout`;
      default: return `${category}.http_${status}`;
    }
  }
  
  // For network errors
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return `${category}.timeout`;
  }
  
  if (error?.code === 'ECONNREFUSED') {
    return `${category}.connection_refused`;
  }
  
  if (error?.message?.includes('Network Error')) {
    return `${category}.network_error`;
  }
  
  // For WebSocket errors - enhanced R1-specific handling
  if (error?.type === 'error' && error?.target instanceof WebSocket) {
    // Check if we have additional context about which endpoint had an issue
    if (error.url || error.endpoint) {
      const url = error.url || error.endpoint || '';
      if (url.includes('/de1/snapshot')) {
        return 'machine.websocket.snapshot';
      } else if (url.includes('/de1/shotSettings')) {
        return 'machine.websocket.shot_settings';
      } else if (url.includes('/de1/waterLevels')) {
        return 'machine.websocket.water_levels';
      } else if (url.includes('/scale/snapshot')) {
        return 'scale.websocket.snapshot';
      }
    }
    return `${category}.websocket_error`;
  }
  
  if (error?.type === 'close' && error?.target instanceof WebSocket) {
    return `${category}.websocket_closed`;
  }
  
  // Check for parsing errors in WebSocket messages
  if (error?.originalData && error?.message?.includes('parsing')) {
    return `${category}.websocket.parse_error`;
  }
  
  // Default error code by category
  switch (category) {
    case ErrorCategory.CONNECTION: return `${category}.failed`;
    case ErrorCategory.DEVICE: return `${category}.error`;
    case ErrorCategory.MACHINE: return `${category}.error`;
    case ErrorCategory.SCALE: return `${category}.error`;
    case ErrorCategory.PROFILE: return `${category}.error`;
    case ErrorCategory.AUTHENTICATION: return `${category}.failed`;
    case ErrorCategory.GENERAL: return `${category}.unknown`;
    default: return 'unknown.error';
  }
}

/**
 * Extracts a user-friendly error message from R1 API responses
 */
function extractR1ErrorMessage(error: any): string | null {
  // Check for R1 specific error format
  if (error?.response?.data?.e) {
    return error.response.data.e;
  }
  
  // Check for standard error message
  if (error?.message) {
    return error.message;
  }
  
  return null;
}

/**
 * Handle R1 API errors with proper categorization and user-friendly messages
 * @param error The error to handle, which can be an Error object, an ErrorInfo object, or any other value
 */
export function handleR1Error(error: any): R1Error {
  // If it's already an R1Error, return it
  if (error instanceof R1Error) {
    return error;
  }
  
  // If it's an ErrorInfo object, create an R1Error from it
  if (error && typeof error === 'object' && 'category' in error && 'code' in error && 'message' in error) {
    const errorInfo = error as ErrorInfo;
    return new R1Error(errorInfo);
  }
  
  // Otherwise, process the error
  const category = determineErrorCategory(error);
  const code = generateErrorCode(category, error);
  
  // Get message from R1 API or error object
  let message = extractR1ErrorMessage(error) || 
                ERROR_CODE_TO_MESSAGE[code] || 
                'An error occurred while communicating with the R1 server.';
  
  // Get a suggestion based on the category
  const suggestions = CATEGORY_SUGGESTIONS[category];
  const suggestion = suggestions?.length ? 
    suggestions[Math.floor(Math.random() * suggestions.length)] : 
    undefined;
  
  return new R1Error({
    message,
    category,
    code,
    originalError: error,
    suggestion
  });
}

/**
 * Generate a user-friendly message for an error
 */
export function getUserFriendlyErrorMessage(error: any): string {
  if (error instanceof R1Error) {
    return error.suggestion ? `${error.message}. ${error.suggestion}` : error.message;
  }
  
  const r1Error = handleR1Error(error);
  return r1Error.suggestion ? `${r1Error.message}. ${r1Error.suggestion}` : r1Error.message;
}

/**
 * Determines if an error should trigger a retry and provides an appropriate delay time
 */
export function getRetryStrategy(error: any): { shouldRetry: boolean; delayMs: number } {
  const r1Error = error instanceof R1Error ? error : handleR1Error(error);
  
  // Don't retry authentication errors
  if (r1Error.category === ErrorCategory.AUTHENTICATION) {
    return { shouldRetry: false, delayMs: 0 };
  }
  
  // Don't retry bad requests
  if (r1Error.code.includes('bad_request')) {
    return { shouldRetry: false, delayMs: 0 };
  }
  
  // Retry connection errors
  if (r1Error.category === ErrorCategory.CONNECTION) {
    // Exponential backoff starting at 1 second, max 30 seconds
    const retryCount = (r1Error.originalError?.config?.retryCount || 0);
    const delayMs = Math.min(1000 * Math.pow(2, retryCount), 30000);
    return { shouldRetry: true, delayMs };
  }
  
  // Retry server errors
  if (r1Error.code.includes('server_error') || 
      r1Error.code.includes('service_unavailable') ||
      r1Error.code.includes('gateway_timeout')) {
    const retryCount = (r1Error.originalError?.config?.retryCount || 0);
    const delayMs = Math.min(2000 * Math.pow(1.5, retryCount), 15000);
    return { shouldRetry: true, delayMs };
  }
  
  // Default: don't retry
  return { shouldRetry: false, delayMs: 0 };
} 