import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpClientApi } from '../../interfaces/HttpClientApi';
import { ErrorCategory, handleR1Error, getRetryStrategy } from '../../utils/errorHandling';

// Maximum number of retries for idempotent requests
const MAX_RETRIES = 3;

export class R1HttpClientAdapter implements HttpClientApi {
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;

  constructor(baseUrl: string, timeout = 30000) {
    this.baseUrl = baseUrl;
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    
    // Add response interceptor for global error handling
    this.httpClient.interceptors.response.use(
      response => response,
      async error => {
        // Extract request configuration
        const config = error.config || {};
        const { method, url } = config;
        
        // Track retry count
        config.retryCount = config.retryCount || 0;
        
        // Process error to get retry strategy
        const { shouldRetry, delayMs } = getRetryStrategy(error);
        
        // Only retry GET, HEAD, OPTIONS requests (idempotent)
        const isIdempotent = ['get', 'head', 'options'].includes(method?.toLowerCase());
        
        // Determine if we should retry this request
        if (shouldRetry && isIdempotent && config.retryCount < MAX_RETRIES) {
          config.retryCount++;
          
          console.log(`Retrying ${method} request to ${url} (attempt ${config.retryCount}/${MAX_RETRIES}) after ${delayMs}ms`);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delayMs));
          
          // Retry the request
          return this.httpClient(config);
        }
        
        // If we've exhausted retries or shouldn't retry, throw the processed error
        const appError = handleR1Error({
          message: error?.message || `HTTP request failed: ${method} ${url}`,
          category: this.determineErrorCategory(error, url || ''),
          code: this.generateErrorCode(error, url || '', method),
          originalError: error
        });
        
        return Promise.reject(appError);
      }
    );
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    try {
      const config: AxiosRequestConfig = {};
      if (params) {
        config.params = params;
      }
      const response: AxiosResponse<T> = await this.httpClient.get(path, config);
      return response.data;
    } catch (error: any) {
      console.error(`Error in HTTP GET request to ${path}:`, error);
      
      // If the error was already processed by interceptor, just rethrow it
      if (error.name === 'R1Error') {
        throw error;
      }
      
      throw handleR1Error({
        message: error?.message || `Failed to get data from ${path}`,
        category: this.determineErrorCategory(error, path),
        code: `http.get_failed.${this.sanitizePath(path)}`,
        originalError: error
      });
    }
  }

  async post<T>(path: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.httpClient.post(path, data);
      return response.data;
    } catch (error: any) {
      console.error(`Error in HTTP POST request to ${path}:`, error);
      
      // If the error was already processed by interceptor, just rethrow it
      if (error.name === 'R1Error') {
        throw error;
      }
      
      throw handleR1Error({
        message: error?.message || `Failed to post data to ${path}`,
        category: this.determineErrorCategory(error, path),
        code: `http.post_failed.${this.sanitizePath(path)}`,
        originalError: error
      });
    }
  }

  async put<T>(path: string, data?: any): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.httpClient.put(path, data);
      return response.data;
    } catch (error: any) {
      console.error(`Error in HTTP PUT request to ${path}:`, error);
      
      // If the error was already processed by interceptor, just rethrow it
      if (error.name === 'R1Error') {
        throw error;
      }
      
      throw handleR1Error({
        message: error?.message || `Failed to put data to ${path}`,
        category: this.determineErrorCategory(error, path),
        code: `http.put_failed.${this.sanitizePath(path)}`,
        originalError: error
      });
    }
  }

  async delete<T>(path: string): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.httpClient.delete(path);
      return response.data;
    } catch (error: any) {
      console.error(`Error in HTTP DELETE request to ${path}:`, error);
      
      // If the error was already processed by interceptor, just rethrow it
      if (error.name === 'R1Error') {
        throw error;
      }
      
      throw handleR1Error({
        message: error?.message || `Failed to delete data at ${path}`,
        category: this.determineErrorCategory(error, path),
        code: `http.delete_failed.${this.sanitizePath(path)}`,
        originalError: error
      });
    }
  }

  /**
   * Sanitizes a path for use in error codes
   */
  private sanitizePath(path: string): string {
    return path.replace(/\//g, '.').replace(/^\./, '');
  }
  
  /**
   * Generates a specific error code based on the error, path, and method
   */
  private generateErrorCode(error: any, path: string, method = 'unknown'): string {
    // Check for specific R1 error formats in response data
    if (error?.response?.data?.e) {
      const r1ErrorMessage = error.response.data.e;
      
      // Check for specific R1 error patterns
      if (/device not found/i.test(r1ErrorMessage)) {
        return 'device.not_found';
      }
      if (/scale not connected/i.test(r1ErrorMessage)) {
        return 'scale.not_connected';
      }
      if (/profile.*invalid/i.test(r1ErrorMessage)) {
        return 'profile.invalid_format';
      }
    }
    
    // Handle connection errors
    if (error?.code === 'ECONNREFUSED') {
      return 'connection.refused';
    }
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'connection.timeout';
    }
    if (error?.message?.includes('Network Error')) {
      return 'connection.network';
    }
    
    // Handle HTTP status codes
    if (error?.response?.status) {
      const status = error.response.status;
      
      // Determine API area from path
      const category = this.pathToCategory(path);
      
      return `${category}.http_${status}`;
    }
    
    // Default by path category and method
    const category = this.pathToCategory(path);
    return `${category}.${method.toLowerCase()}_failed`;
  }

  /**
   * Determines the error category based on the error and the API path
   */
  private determineErrorCategory(error: any, path: string): ErrorCategory {
    // Check if it's a network error
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return ErrorCategory.CONNECTION;
    }
    
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('Network Error')) {
      return ErrorCategory.CONNECTION;
    }
    
    // Check response status
    const status = error?.response?.status;
    if (status) {
      if (status === 401 || status === 403) {
        return ErrorCategory.AUTHENTICATION;
      }
      if (status === 404) {
        return ErrorCategory.GENERAL;
      }
    }
    
    // Check for R1 specific error message patterns
    if (error?.response?.data?.e) {
      const r1ErrorMessage = error.response.data.e;
      if (/bluetooth|device/i.test(r1ErrorMessage)) {
        return ErrorCategory.DEVICE;
      }
      if (/machine|de1/i.test(r1ErrorMessage)) {
        return ErrorCategory.MACHINE;
      }
      if (/scale|weight/i.test(r1ErrorMessage)) {
        return ErrorCategory.SCALE;
      }
      if (/profile/i.test(r1ErrorMessage)) {
        return ErrorCategory.PROFILE;
      }
    }
    
    return this.pathToCategory(path);
  }
  
  /**
   * Maps an API path to an error category
   */
  private pathToCategory(path: string): ErrorCategory {
    if (path.includes('/machine') || path.includes('/de1')) {
      return ErrorCategory.MACHINE;
    } else if (path.includes('/scale')) {
      return ErrorCategory.SCALE;
    } else if (path.includes('/profiles')) {
      return ErrorCategory.PROFILE;
    } else if (path.includes('/devices')) {
      return ErrorCategory.DEVICE;
    }
    
    return ErrorCategory.GENERAL;
  }
} 