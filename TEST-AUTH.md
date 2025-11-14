# Testing Credential Authentication - DEBUG STEPS

## Current Status

✅ Session is being created successfully on backend
✅ Session cookie configured for `.tedcharles.net` domain
✅ Debug logging enabled in auth middleware

## Test Steps

### 1. Clear Cookies First
```
1. Open browser DevTools (F12)
2. Go to Application → Cookies
3. Clear all cookies for your domain
4. Refresh page
```

### 2. Login with Password
```
1. Go to: https://www-dev.tedcharles.net/login
2. Click "Password" tab  
3. Enter username: testuser
4. Enter password: (your password)
5. Click "Sign In"
```

**Expected**: Redirects to `/admin`

### 3. Check Browser Cookies
```
1. Open DevTools → Application → Cookies
2. Look for cookie named: connect.sid
3. Verify it exists and shows:
   - Domain: .tedcharles.net
   - Path: /
   - HttpOnly: ✓
   - Secure: ✓
```

### 4. Test Protected Route
```
1. In admin panel, click "Settings"
2. Try to expand "User Management" section
```

**Expected**: Should load users
**If fails**: You'll see 401 error in Network tab

### 5. Check Backend Logs
```bash
pm2 logs backend --lines 100 | grep -E "\[Login\]|\[Auth Middleware\]"
```

**What to look for**:
```
[Login] ✅ Session saved successfully: { sessionID: 'xxx', userId: 2 }
[Auth Middleware] { path: '/users', method: 'GET', hasUserId: true, userId: 2 }
[Auth Middleware] ✅ Authenticated via credentials
```

## Common Issues & Fixes

### Issue 1: Cookie Not Set
**Symptoms**: No `connect.sid` cookie in browser
**Cause**: Cookie domain mismatch or SameSite blocking
**Fix**: Check you're accessing via `www-dev.tedcharles.net` (not `localhost` or different subdomain)

### Issue 2: Cookie Not Sent
**Symptoms**: Cookie exists but backend logs show `hasUserId: false`
**Cause**: CORS or credentials not included
**Check Network Tab**:
```
1. Open request in Network tab
2. Check Request Headers
3. Should see: Cookie: connect.sid=xxx
```

### Issue 3: Session Not Retrieved
**Symptoms**: Cookie sent but backend still shows `hasUserId: false`
**Cause**: Session not being deserialized
**Debug**: Session might have expired or been cleared

## Manual API Test

Test the auth status endpoint directly:

```bash
# After logging in, test in browser console:
fetch('https://api-dev.tedcharles.net/api/auth/status', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('Auth status:', data))

# Expected response:
# { authenticated: true, user: { id: 2, email: '...' } }
```

## Debug Output Analysis

### Successful Login Flow:
```
[Login] Creating session for user: { userId: 2, email: 'xxx', sessionID: 'abc123' }
[Login] ✅ Session saved successfully: { sessionID: 'abc123', userId: 2 }
```

### Successful Authenticated Request:
```
[Auth Middleware] { 
  path: '/users', 
  method: 'GET', 
  hasIsAuthenticated: true,
  isAuthenticatedResult: false,
  sessionId: 'abc123',
  hasUserId: true,
  userId: 2
}
[Auth Middleware] ✅ Authenticated via credentials
```

### Failed Authentication (Session Not Found):
```
[Auth Middleware] {
  path: '/users',
  method: 'GET',
  hasIsAuthenticated: true,
  isAuthenticatedResult: false,
  sessionId: 'different-id',  // <-- Different session ID!
  hasUserId: false,            // <-- No userId in session
  userId: undefined
}
[Auth Middleware] ❌ Not authenticated
```

## Quick Fix Checklist

- [ ] Cleared all cookies before testing
- [ ] Logged in via https://www-dev.tedcharles.net (not localhost)
- [ ] Confirmed `connect.sid` cookie exists in browser
- [ ] Confirmed cookie has correct domain (`.tedcharles.net`)
- [ ] Checked Network tab shows cookie being sent
- [ ] Checked backend logs show session created
- [ ] Checked backend logs show session recognized

## If Still Failing

**Collect this info**:
1. Browser console errors
2. Network tab for failed request (Headers section)
3. Backend logs: `pm2 logs backend --lines 200 | grep -E "\[Login\]|\[Auth Middleware\]"`
4. Cookie details from DevTools

Then we can diagnose the exact issue!

---

## Expected Normal Flow

1. **Login**:
   - POST to `/api/auth-extended/login`
   - Backend creates session with `userId`
   - Backend sets `connect.sid` cookie
   - Response: `{ success: true, user: {...} }`

2. **Protected Request**:
   - Browser automatically sends `connect.sid` cookie
   - Backend retrieves session by cookie
   - Backend finds `userId` in session data
   - Request proceeds

3. **Auth Middleware**:
   - Checks `req.isAuthenticated()` (Passport) → false
   - Checks `req.session.userId` (Credentials) → found!
   - Allows request to proceed

---

**Debug mode is active** - all requests will be logged!
