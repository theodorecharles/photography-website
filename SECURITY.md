# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please report it by emailing **me@tedcharles.net**. Please do not create public GitHub issues for security vulnerabilities.

We take all security reports seriously and will respond as quickly as possible.

## Security Best Practices

This project implements several security measures to protect against common vulnerabilities:

### 1. Authentication & Authorization
- **Google OAuth 2.0**: Secure authentication using Google's OAuth service
- **Session Management**: Secure sessions with httpOnly cookies and CSRF protection
- **Email Whitelist**: Only authorized email addresses can access the admin panel
- **Session Secrets**: Strong session secrets required in production (enforced at startup)

### 2. Input Validation & Sanitization
- **Path Traversal Protection**: All file paths are sanitized to prevent directory traversal attacks
- **SQL Injection Protection**: Pre-defined SQL queries only; arbitrary SQL execution disabled
- **File Upload Validation**: File type, size, and extension validation for uploads
- **XSS Prevention**: Input sanitization to prevent cross-site scripting

### 3. Rate Limiting & DoS Protection
- **API Rate Limiting**: 10 requests per second per IP address
- **Request Size Limits**: JSON requests limited to 1MB, file uploads to 50MB per file
- **File Upload Limits**: Maximum 20 files per upload request

### 4. Security Headers
- **HSTS**: HTTP Strict Transport Security enabled in production
- **X-Frame-Options**: Clickjacking protection (DENY)
- **X-Content-Type-Options**: MIME type sniffing prevention (nosniff)
- **Referrer-Policy**: Strict referrer policy for privacy
- **CORS**: Restricted to configured allowed origins only

### 5. HTTPS & Transport Security
- **Automatic HTTPS Redirect**: HTTP requests redirected to HTTPS in production
- **Secure Cookies**: Cookies marked as secure in production (HTTPS only)
- **Certificate Validation**: All external API calls validate SSL certificates

### 6. Command Injection Prevention
- **execFile Usage**: Shell commands executed via `execFile` instead of `exec`
- **Argument Validation**: All command arguments validated before execution
- **Path Sanitization**: File paths validated to prevent command injection

### 7. Analytics Security
- **Server-Side Proxying**: Analytics credentials never exposed to frontend
- **Origin Validation**: Analytics events validated by origin
- **No Client-Side Secrets**: HMAC signing removed from client side

### 8. Error Handling
- **Sanitized Error Messages**: Error details not leaked to clients
- **Secure Logging**: Sensitive data not logged in production
- **Graceful Degradation**: Analytics and non-critical features fail silently

## Environment Variables for Production

For production deployments, the following environment variables should be set to override values in `config.json`:

```bash
# Required in Production
export GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
export SESSION_SECRET="$(openssl rand -hex 32)"
export ANALYTICS_USERNAME="your-openobserve-username"
export ANALYTICS_PASSWORD="your-openobserve-password"

# Optional
export ANALYTICS_SERVICE_TOKEN="your-openobserve-service-token"
export PORT="3001"
export PHOTOS_DIR="/path/to/photos"
export ALLOWED_ORIGINS="https://www.yourdomain.com"
```

**Never commit secrets to version control.** Use environment variables or a secure secrets management system in production.

## Configuration Security Checklist

Before deploying to production, ensure:

- [ ] All secrets moved to environment variables (not in `config.json`)
- [ ] `config.json` added to `.gitignore` (already done)
- [ ] Strong session secret generated (use `openssl rand -hex 32`)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Authorized emails list configured correctly
- [ ] Rate limits appropriate for your traffic
- [ ] File upload limits appropriate for your needs
- [ ] Firewall configured to allow only necessary ports
- [ ] Database backups configured (if applicable)
- [ ] Server logs monitored for suspicious activity

## Security Features by Layer

### Frontend Security
- Analytics tracking validated by backend
- No sensitive credentials in frontend code
- XSS prevention via React's built-in escaping
- CORS enforced by backend

### Backend Security
- Input validation on all user-supplied data
- Authentication required for all admin operations
- CSRF protection on state-changing operations
- Rate limiting to prevent abuse
- Secure session management
- Command injection prevention
- File upload validation

### Infrastructure Security
- HTTPS enforced in production
- Secure headers configured
- Cookie security settings (httpOnly, secure, sameSite)
- Proxy trust settings for correct IP detection
- Process isolation via PM2

## Known Limitations

1. **Photo Privacy**: All photos served via `/photos` and `/optimized` endpoints are publicly accessible. This is by design for a portfolio website, but be aware that any photo uploaded is publicly viewable if someone knows the URL.

2. **Console Logging**: The application currently uses `console.log` for logging. For production, consider implementing a structured logging library (like Winston or Pino) for better log management and security.

3. **No CSRF Tokens**: CSRF protection relies on SameSite cookies and origin validation rather than CSRF tokens. This is generally sufficient but may not work in all edge cases.

4. **Basic Rate Limiting**: Rate limiting is per-IP and may not be effective against distributed attacks. Consider adding additional layers like CloudFlare for production.

## Security Updates

This project uses npm for dependency management. To check for security vulnerabilities:

```bash
npm audit
```

To automatically fix vulnerabilities:

```bash
npm audit fix
```

## Regular Security Maintenance

1. **Update Dependencies**: Run `npm update` regularly to get security patches
2. **Review Logs**: Monitor server logs for suspicious activity
3. **Rotate Secrets**: Periodically rotate session secrets and API keys
4. **Backup Data**: Regularly backup photos and configuration
5. **Review Access**: Audit authorized email list and remove old accounts

## License

This security policy is part of the photography website project and follows the same license terms.

Last Updated: 2025-10-25

