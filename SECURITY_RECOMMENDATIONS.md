# Security Recommendations

## Priority Fixes

### 1. Move Frontend URL to Config
**File**: `backend/src/routes/auth.ts`
**Current**:
```typescript
const frontendUrl = process.env.NODE_ENV === 'production' 
  ? 'https://tedcharles.net' 
  : 'http://localhost:5173';
```
**Fix**: Use config value
```typescript
import config from '../config.js';
const frontendUrl = config.frontend.siteUrl || (
  process.env.NODE_ENV === 'production' 
    ? 'https://tedcharles.net' 
    : 'http://localhost:5173'
);
```

### 2. Add CSRF Protection
**Install**: `npm install csurf` (or use custom middleware)
```typescript
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);
```

### 3. Production Session Store
**For production**, use Redis or PostgreSQL:
```bash
npm install connect-redis redis
```
```typescript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient();
app.use(session({
  store: new RedisStore({ client: redisClient }),
  // ... other options
}));
```

### 4. Enable Content Security Policy
```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
})
```

### 5. Add Request ID Tracking
For better logging and debugging:
```bash
npm install express-request-id
```

### 6. Add Security Headers
Already using Helmet ✓ but consider adding:
```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

## Production Checklist

- [ ] Change ALL secrets in `config/config.json`
- [ ] Rotate OpenObserve password (was exposed in old commits)
- [ ] Generate new session secret (`openssl rand -hex 32`)
- [ ] Set up Redis for session storage
- [ ] Enable HTTPS (Let's Encrypt)
- [ ] Configure reverse proxy (nginx/Cloudflare)
- [ ] Set up monitoring/alerting
- [ ] Regular `npm audit` checks
- [ ] Backup strategy for photos
- [ ] Rate limit tightening for production

## Monitoring Recommendations

1. **Log suspicious activities**:
   - Failed login attempts
   - Rate limit violations
   - Invalid path accesses

2. **Set up alerts** for:
   - Multiple failed auth attempts
   - Unusual traffic patterns
   - Server errors

3. **Regular audits**:
   - Review access logs monthly
   - Check for unauthorized sessions
   - Monitor API usage patterns

## Best Practices Maintained ✅

- ✅ Secrets in config file (gitignored)
- ✅ Input validation on all routes
- ✅ Rate limiting configured
- ✅ CORS properly configured
- ✅ Secure session cookies
- ✅ HTTPOnly cookies
- ✅ No SQL injection risk (no database)
- ✅ No XSS vulnerabilities
- ✅ OAuth properly implemented
- ✅ Email whitelist authorization

