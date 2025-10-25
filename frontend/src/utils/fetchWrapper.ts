/**
 * Fetch wrapper that detects rate limiting (429) responses
 * and shows a friendly error message
 */

export async function fetchWithRateLimitCheck(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);
  
  // Check for rate limiting
  if (response.status === 429) {
    if ((window as any).handleRateLimit) {
      (window as any).handleRateLimit();
    }
    throw new Error('Rate limited');
  }
  
  return response;
}

