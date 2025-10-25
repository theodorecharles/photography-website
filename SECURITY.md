# Security Documentation

## Overview
This document outlines the security measures implemented in the photography website and provides guidance for maintaining security.

## Authentication & Authorization

### Google OAuth
- **Implementation**: Passport.js with Google OAuth 2.0
- **Protection**: Email whitelist in configuration
- **Session Management**: Express sessions with secure cookies

### Protected Endpoints
All state-changing operations require authentication:
- `POST /api/albums` - Create album
- `DELETE /api/albums/:album` - Delete album
- `DELETE /api/albums/:album/photos/:photo` - Delete photo
- `POST /api/albums/:album/upload` - Upload photos
- `POST /api/albums/:album/optimize` - Trigger optimization
- `PUT /api/branding` - Update branding
- `POST /api/branding/upload-logo` - Upload logo
- `PUT /api/external-links` - Update external links
- `POST /api/auth/logout` - Logout

### Public Endpoints
Read-only operations are publicly accessible:
- `GET /api/albums` - List albums
- `GET /api/albums/:album/photos` - Get album photos
- `GET /api/random-photos` - Get random photos
- `GET /api/external-pages` - Get external pages
- `GET /api/branding` - Get branding config
- `GET /api/health` - Health check
- `GET /api/current-year` - Current year
- `GET /sitemap.xml` - Sitemap

## Security Measures

### 1. Input Validation & Sanitization
- **Path Traversal Protection**: All file operations use sanitized paths
- **File Upload Security**: Multer with MIME type and extension validation
- **Input Length Limits**: Maximum lengths enforced on all text inputs
- **XSS Prevention**: Input sanitization removes potentially dangerous characters

### 2. Rate Limiting
- **Configuration**: 50 requests per second per IP
- **Scope**: Applied to all `/api/` endpoints
- **Protection**: Prevents brute force and DoS attacks

### 3. CORS Configuration
- **Development**: Allows localhost origins
- **Production**: Restricted to tedcharles.net domains
- **Credentials**: Enabled for authenticated requests

### 4. Security Headers
- **Helmet.js**: Configures security headers
- **CSP**: Disabled for image serving (configured for cross-origin images)
- **CORS Policy**: Cross-origin resource policy set appropriately

### 5. Session Security
- **HttpOnly**: Cookies cannot be accessed via JavaScript
- **Secure**: HTTPS-only in production
- **SameSite**: Lax policy for OAuth compatibility
- **Domain**: Configured for subdomain sharing in production

### 6. CSRF Protection
- **Method**: Session-based authentication requirement
- **Origin Validation**: Checks request origin against allowed domains
- **Scope**: Applied to all state-changing operations

## Environment Variables (Production)

For production deployment, set these environment variables to secure sensitive data:

```bash
# Google OAuth
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Session Security
SESSION_SECRET=your_strong_session_secret

# Analytics
ANALYTICS_PASSWORD=your_analytics_password
ANALYTICS_HMAC_SECRET=your_hmac_secret
```

## File Upload Security

### Validation
- **File Types**: Only JPEG, PNG, GIF allowed
- **File Size**: Maximum 50MB per file
- **Filename**: No path traversal characters
- **MIME Type**: Server-side validation

### Storage
- **Temporary**: Files uploaded to system temp directory
- **Permanent**: Moved to photos directory after validation
- **Cleanup**: Temporary files cleaned up after processing

## Configuration Security

### Sensitive Data
- **Client Secrets**: Should be in environment variables
- **Session Secrets**: Must be strong, random strings
- **API Keys**: Stored in environment variables

### File Permissions
- **Config Files**: Should not be world-readable
- **Photo Directories**: Appropriate permissions for web serving
- **Log Files**: Secure logging without sensitive data

## Monitoring & Logging

### Security Events
- **Failed Authentication**: Logged for monitoring
- **Rate Limit Exceeded**: Tracked and logged
- **File Upload Errors**: Logged for analysis
- **CORS Violations**: Warned in logs

### Error Handling
- **Production**: Generic error messages to prevent information disclosure
- **Development**: Detailed error messages for debugging
- **Logging**: Server-side logging of all errors

## Best Practices

### Development
1. Never commit sensitive data to version control
2. Use environment variables for all secrets
3. Test authentication flows thoroughly
4. Validate all user inputs
5. Use HTTPS in production

### Production
1. Set all required environment variables
2. Use strong, unique secrets
3. Monitor logs for suspicious activity
4. Keep dependencies updated
5. Regular security audits

## Incident Response

### If Compromise Suspected
1. Immediately rotate all secrets
2. Check logs for unauthorized access
3. Review file uploads for malicious content
4. Update all dependencies
5. Consider temporary service shutdown if necessary

### Regular Maintenance
1. Monthly security updates
2. Quarterly dependency audits
3. Annual security review
4. Backup verification
5. Access log analysis

## Contact

For security concerns or to report vulnerabilities, contact: me@tedcharles.net