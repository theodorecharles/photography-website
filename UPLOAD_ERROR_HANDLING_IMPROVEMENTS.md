# Upload Error Handling Improvements

## Problem
When uploading large numbers of photos, network errors were occurring with no retry logic or detailed error information. This made it difficult to diagnose issues.

## Root Causes Identified

1. **No SSE Connection Timeout Detection** - Long-running uploads could hang indefinitely if the connection died
2. **No Retry Logic** - Transient network errors caused permanent failures
3. **Generic Error Messages** - Hard to debug what went wrong (no HTTP status codes, no error details)
4. **Server Timeout Too Short** - Node.js default timeout could close long-running SSE connections during optimization
5. **No stderr Logging** - ImageMagick errors weren't being captured

## Solutions Implemented

### Frontend Improvements (AlbumsManager.tsx)

#### 1. Automatic Retry with Exponential Backoff
- Retries transient network errors up to 3 times
- Uses exponential backoff: 1s, 2s, 4s
- Only retries for retryable errors:
  - Connection timeouts
  - Network connection failures
  - Connection aborts
  - Server unreachable
- Displays retry attempt in UI: "Retry attempt 2/3"

#### 2. SSE Connection Timeout Detection
- Monitors SSE connection activity every 5 seconds
- 5-minute timeout for inactivity (configurable)
- Automatically aborts stalled connections
- Clear error message showing how long the timeout was

#### 3. Enhanced Error Messages
- HTTP status codes included (e.g., "HTTP 500: Internal Server Error")
- Server error messages parsed and displayed
- Network errors clearly identified
- Distinction between retryable and permanent errors
- Detailed error summary in failed uploads section

#### 4. Better Error Categorization
```typescript
// Examples of improved error messages:
- "HTTP 413: File too large (max 100MB)"
- "Connection timeout (no activity for 300s)"
- "HTTP 500: Optimization failed (failed after 3 retries)"
- "Network connection failed - Unable to reach server"
```

#### 5. Activity Tracking
- Updates `lastActivityTime` on every:
  - Upload progress event
  - SSE message received
- Prevents false timeout on slow but active connections

### Backend Improvements

#### 1. Extended Server Timeouts (server.ts)
```typescript
server.timeout = 600000;        // 10 minutes
server.keepAliveTimeout = 610000;
server.headersTimeout = 620000;
```
- Allows long-running optimizations without timeout
- Prevents premature connection closure
- Keeps connections alive during processing

#### 2. stderr Logging (album-management.ts)
- Captures ImageMagick error output
- Logs to console with file context:
  ```
  [AlbumName/photo.jpg] Optimization stderr: convert: corrupt image
  ```
- Helps diagnose optimization failures

## Testing Recommendations

### 1. Test with Large Batches
Upload 50-100 photos to verify:
- Retry logic works on transient failures
- Error messages are helpful
- No phantom timeouts on slow connections

### 2. Test Network Interruption
- Disconnect network mid-upload
- Verify retry attempts occur
- Check error message clarity

### 3. Test Server Load
- Upload many photos simultaneously
- Monitor backend logs for:
  - stderr output from ImageMagick
  - Connection timeout messages
  - Process spawn errors

### 4. Monitor Backend Logs
When reproducing errors, check for:
```bash
# Look for optimization errors
grep "Optimization stderr" /var/log/your-app.log

# Look for timeout issues
grep "timeout" /var/log/your-app.log

# Look for spawn errors
grep "ENOENT\|spawn" /var/log/your-app.log
```

## Potential Remaining Issues

If errors still occur with large uploads, consider:

### 1. Concurrent Process Limit
Each upload spawns 3 ImageMagick processes. 50 uploads = 150 processes.
**Solution:** Add a queue on the backend to limit concurrent optimizations:
```typescript
const MAX_CONCURRENT_OPTIMIZATIONS = 10;
const optimizationQueue = [];
```

### 2. Memory Exhaustion
Large images + many concurrent optimizations = high memory usage.
**Solution:** Monitor with `htop` or `pm2 monit`, add swap space if needed.

### 3. Rate Limiting
50 uploads/second could trigger rate limiter.
**Solution:** Already using `skipFailedRequests: true`, but can increase limit if needed.

### 4. Database Lock Contention
If using SQLite, concurrent writes could cause SQLITE_BUSY errors.
**Solution:** Already handled by better-sqlite3, but can add write-ahead logging if needed.

## Next Steps

1. **Push these changes** and test with a large batch of photos
2. **Monitor the backend logs** during upload to see actual errors
3. **Report any specific error messages** you see - now we'll have much better diagnostics
4. If issues persist, we can add:
   - Backend optimization queue
   - More aggressive rate limiting
   - Memory usage monitoring
   - Process pool management

## Configuration

### Adjust Timeouts
To change timeout values, edit `AlbumsManager.tsx`:
```typescript
const SSE_TIMEOUT = 300000;  // 5 minutes (in milliseconds)
const MAX_RETRIES = 3;        // Number of retry attempts
const RETRY_DELAY = 1000;     // Initial delay (doubles each retry)
```

### Adjust Server Timeouts
Edit `backend/src/server.ts`:
```typescript
server.timeout = 600000;  // 10 minutes for optimization
```

