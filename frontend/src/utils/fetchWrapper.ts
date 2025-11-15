/**
 * Fetch wrapper that detects rate limiting (429) and auth errors (401)
 * and handles them appropriately.
 * 
 * Automatically includes credentials (cookies) for authentication.
 */

export async function fetchWithRateLimitCheck(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // Merge init options with credentials: 'include' to ensure cookies are sent
  const mergedInit: RequestInit = {
    ...init,
    credentials: 'include', // Always include credentials for session cookies
  };
  
  const response = await fetch(input, mergedInit);
  
  // Check for rate limiting
  if (response.status === 429) {
    if ((window as any).handleRateLimit) {
      (window as any).handleRateLimit();
    }
    throw new Error('Rate limited');
  }
  
  // Check for authentication errors (401 Unauthorized)
  // Skip for /api/auth/status to avoid infinite loops
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (response.status === 401 && !url.includes('/api/auth/status')) {
    window.dispatchEvent(new CustomEvent('auth-error', { 
      detail: { message: 'Your session has expired. Please log in again.' } 
    }));
  }
  
  return response;
}

