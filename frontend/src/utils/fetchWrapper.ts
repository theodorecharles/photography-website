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
  
  return response;
}

