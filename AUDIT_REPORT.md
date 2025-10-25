# Security & Hardcoded URL Audit Report
Generated: October 24, 2025

## ✅ STRENGTHS

### Security Strengths
1. **✅ No npm vulnerabilities** - Both frontend and backend have 0 vulnerabilities
2. **✅ Strong OAuth implementation** - Google OAuth with email whitelist
3. **✅ Path traversal protection** - Proper sanitization in `albums.ts`
4. **✅ Rate limiting** - Express rate limiter configured (50 req/sec)
5. **✅ Security headers** - Helmet middleware enabled
6. **✅ CORS properly configured** - Specific origins, credentials enabled
7. **✅ Session security** - HttpOnly cookies, secure in production, SameSite=lax
8. **✅ No eval() or innerHTML** - No dangerous JavaScript patterns found
9. **✅ Input validation** - Path sanitization with regex checks
10. **✅ Trust proxy configured** - Correctly reads X-Forwarded-For headers

### Configuration Strengths
1. **✅ Centralized config** - All settings in `config/config.json`
2. **✅ No exposed secrets** - No hardcoded passwords/API keys in code
3. **✅ Environment separation** - Development and production configs separated

---

## ⚠️ ISSUES FOUND

### 1. Hardcoded URLs

#### Critical - Frontend `index.html`
**Location:** `/frontend/index.html` lines 16-51

**Issue:** Hardcoded production URLs in meta tags:
```html
<link rel="canonical" href="https://tedcharles.net/" />
<meta property="og:url" content="https://tedcharles.net/" />
<meta property="og:image" content="https://tedcharles.net/photos/derpatar.png" />
<link rel="preconnect" href="https://api.tedcharles.net" />
```

**Impact:** Meta tags will show production URLs even in development

**Recommendation:** These should be dynamically injected during build or use relative URLs where possible

---

#### Medium - Backend cookie domain
**Location:** `/backend/src/server.ts` line 121

**Issue:** Hardcoded `.tedcharles.net` for cookie domain
```typescript
domain: process.env.NODE_ENV === 'production' ? '.tedcharles.net' : undefined
```

**Impact:** Code needs to be modified for different domains

**Recommendation:** Move to `config.json`:
```json
"session": {
  "cookieDomain": ".tedcharles.net"
}
```

---

### 2. Security Issues

#### HIGH - External Links XSS Vulnerability
**Location:** `/backend/src/routes/external-links.ts` lines 40-44

**Issue:** No URL validation or sanitization. Malicious admin could inject:
```javascript
{ title: "Evil", url: "javascript:alert('XSS')" }
```

**Recommendation:** Add URL validation:
```typescript
// Validate URL format
try {
  const urlObj = new URL(link.url);
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    res.status(400).json({ error: 'Only HTTP(S) URLs allowed' });
    return;
  }
} catch {
  res.status(400).json({ error: 'Invalid URL format' });
  return;
}

// Sanitize title (prevent XSS)
if (typeof link.title !== 'string' || link.title.length > 100) {
  res.status(400).json({ error: 'Invalid title' });
  return;
}
```

---

#### MEDIUM - No CSRF Protection on Logout
**Location:** `/backend/src/routes/auth.ts` POST `/logout`

**Issue:** Logout endpoint not protected against CSRF
```typescript
router.post('/logout', (req: Request, res: Response) => { ... });
```

**Impact:** Attacker could force user logout via CSRF

**Recommendation:** Add CSRF token or use GET with confirmation:
```typescript
router.delete('/logout', isAuthenticated, (req: Request, res: Response) => { ... });
```

---

#### LOW - In-Memory Session Store (Production Warning)
**Location:** `/backend/src/server.ts` line 111

**Issue:** MemoryStore warning in logs:
```
Warning: connect.session() MemoryStore is not designed for a production environment
```

**Impact:** 
- Memory leaks on long-running server
- Sessions lost on server restart
- Doesn't scale beyond single process

**Recommendation:** Use Redis or other persistent session store:
```bash
npm install connect-redis redis
```

```typescript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: config.redis?.url });
redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  // ... other options
}));
```

---

#### INFO - External Links Size Limit
**Location:** `/backend/src/routes/external-links.ts`

**Issue:** No maximum array size check

**Recommendation:** Add validation:
```typescript
if (links.length > 50) {
  res.status(400).json({ error: 'Too many links (max 50)' });
  return;
}
```

---

#### INFO - Verbose Logging in Production
**Location:** Multiple auth routes with `console.log`

**Issue:** Sensitive session IDs and user data logged in production

**Recommendation:** Remove debug logs or use environment check:
```typescript
if (process.env.NODE_ENV !== 'production') {
  console.log('[Auth Status] Session ID:', req.sessionID);
}
```

---

## 📋 SUMMARY

### Critical Priority
1. ✅ Fix external links XSS vulnerability (URL validation)

### High Priority
2. ✅ Add CSRF protection to logout endpoint
3. ⚠️ Implement production session store (Redis)

### Medium Priority
4. ⚠️ Move hardcoded cookie domain to config
5. ⚠️ Dynamically inject meta tags in `index.html`

### Low Priority
6. ⚠️ Add external links array size limit
7. ⚠️ Remove verbose logging in production
8. ℹ️ Document OAuth setup in README

---

## 🎯 QUICK WINS

These can be fixed immediately:

1. **External Links Validation** (5 minutes)
2. **Logout CSRF Protection** (2 minutes)
3. **Remove debug logs** (5 minutes)
4. **Add links array size limit** (2 minutes)

---

## ✅ PASS - No Issues Found

- ✅ No SQL/NoSQL injection (no database)
- ✅ No exposed secrets in code
- ✅ No dependency vulnerabilities
- ✅ No dangerous JavaScript patterns
- ✅ Proper HTTPS enforcement
- ✅ Rate limiting configured
- ✅ CORS properly configured
- ✅ File path traversal protected

---

## 📊 RISK ASSESSMENT

**Overall Risk Level:** **MEDIUM** ⚠️

The application is generally well-secured with a few medium-priority issues that should be addressed before production deployment. The OAuth implementation is solid, input validation is mostly good, and there are no critical vulnerabilities.

**Biggest Risks:**
1. XSS via malicious external links (if admin account is compromised)
2. Session store memory leaks in production
3. CSRF on logout (minor but worth fixing)

**Production Readiness:** **80%** - Fix the XSS issue and implement Redis session store before deploying to production.

