/**
 * Interface for HTTP client operations
 */
export interface HttpClientApi {
  /**
   * Perform GET request
   * @param path API path
   * @param params Optional query parameters
   * @returns Promise with response data
   */
  get<T>(path: string, params?: Record<string, any>): Promise<T>;
  
  /**
   * Perform POST request
   * @param path API path
   * @param data Optional request body
   * @returns Promise with response data
   */
  post<T>(path: string, data?: any): Promise<T>;
  
  /**
   * Perform PUT request
   * @param path API path
   * @param data Optional request body
   * @returns Promise with response data
   */
  put<T>(path: string, data?: any): Promise<T>;
  
  /**
   * Perform DELETE request
   * @param path API path
   * @returns Promise with response data
   */
  delete<T>(path: string): Promise<T>;
} 