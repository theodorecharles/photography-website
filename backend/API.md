# Photography Website Backend API

Complete API documentation for the Ted Charles Photography website backend.

## Overview

This backend provides a RESTful API for:
- **Public access**: Viewing albums, photos, and site configuration
- **Authenticated access**: Managing albums, photos, branding, and external links
- **Analytics**: Tracking user interactions with HMAC-signed events
- **OAuth**: Google OAuth 2.0 authentication for admin users

## Quick Start

### Viewing the API Documentation

The API is documented using OpenAPI 3.0 specification. You can view it using:

**Online Viewers:**
- [Swagger Editor](https://editor.swagger.io/) - Paste the contents of `openapi.yaml`
- [Redoc](https://redocly.github.io/redoc/) - Beautiful API documentation

**Local Tools:**
```bash
# Using Swagger UI (Docker)
docker run -p 8080:8080 -e SWAGGER_JSON=/openapi.yaml -v $(pwd):/app swaggerapi/swagger-ui

# Using Redoc (npx)
npx @redocly/cli preview-docs openapi.yaml
```

### Base URLs

- **Production**: `https://api.tedcharles.net`
- **Development**: `http://localhost:3001`

## Authentication

### Public Endpoints
Most read-only endpoints are public and require no authentication:
- `GET /api/albums`
- `GET /api/albums/{album}/photos`
- `GET /api/branding`
- `GET /api/external-links`
- `GET /api/health`
- etc.

### Authenticated Endpoints
Admin operations require Google OAuth authentication:

1. **Initiate login**: Navigate to `GET /api/auth/google`
2. **Complete OAuth flow**: User is redirected through Google
3. **Session created**: Server sets `connect.sid` cookie
4. **CSRF protection**: All mutating operations require valid CSRF token

Session cookies are:
- `httpOnly` - Not accessible to JavaScript
- `secure` - Only sent over HTTPS (in production)
- `sameSite: 'lax'` - CSRF protection

## Security Features

### CSRF Protection
All state-changing operations (POST, PUT, DELETE) are protected by CSRF tokens. The token is validated using the `csurf` middleware.

### HMAC Signature Validation
Analytics events must be signed with HMAC-SHA256:

```javascript
const crypto = require('crypto');
const payload = JSON.stringify(events);
const hmac = crypto.createHmac('sha256', secret);
hmac.update(payload);
const signature = hmac.digest('hex');

// Send in header
headers['X-Analytics-Signature'] = signature;
```

### Path Traversal Protection
All file operations sanitize inputs to prevent directory traversal attacks:
- Album/photo names must match `^[a-zA-Z0-9_-]+$`
- No `..`, `/`, or `\` characters allowed
- All paths are validated before file system access

### Rate Limiting
All endpoints are rate-limited to prevent abuse (configured in `security` section of `config.json`).

## Key Endpoints

### Albums & Photos

```bash
# List all albums
GET /api/albums

# Get photos in an album
GET /api/albums/nature/photos

# Get all photos in random order (for homepage)
GET /api/random-photos

# Create album (auth required)
POST /api/albums
Content-Type: application/json
{"name": "vacation-2024"}

# Upload photos (auth required)
POST /api/albums/vacation-2024/upload
Content-Type: multipart/form-data
[files...]

# Delete photo (auth required)
DELETE /api/albums/vacation-2024/photos/IMG_1234.jpg

# Delete album (auth required)
DELETE /api/albums/vacation-2024
```

### Branding

```bash
# Get branding config
GET /api/branding

# Update branding (auth required)
PUT /api/branding
Content-Type: application/json
{
  "siteName": "My Photography",
  "primaryColor": "#FF5733",
  "metaDescription": "My awesome photos"
}

# Upload avatar (auth required)
POST /api/branding/upload-avatar
Content-Type: multipart/form-data
```

### External Links

```bash
# Get external links
GET /api/external-links

# Update external links (auth required)
PUT /api/external-links
Content-Type: application/json
{
  "links": [
    {"title": "Youtube", "url": "https://youtube.com/@ted_charles"},
    {"title": "Github", "url": "https://github.com/theodoreroddy"}
  ]
}
```

### Analytics

```bash
# Track event (requires HMAC signature)
POST /api/analytics/track
Content-Type: application/json
X-Analytics-Signature: <hmac-sha256-signature>
[
  {
    "event_type": "pageview",
    "timestamp": "2024-01-01T12:00:00Z",
    "page_url": "https://tedcharles.net/album/nature",
    "page_path": "/album/nature",
    "referrer": "direct",
    "user_agent": "Mozilla/5.0...",
    "screen_width": 1920,
    "screen_height": 1080,
    "viewport_width": 1920,
    "viewport_height": 969
  }
]
```

### Authentication

```bash
# Check auth status
GET /api/auth/status

# Initiate Google login
GET /api/auth/google

# Logout (auth required)
POST /api/auth/logout
```

## Event Types

Analytics supports these event types:

### Public Events
- `pageview` - Page view
- `photo_click` - Photo opened in modal
- `photo_navigation` - Next/previous in modal
- `photo_download` - Photo download
- `modal_close` - Modal closed
- `album_navigation` - Album link clicked
- `external_link_click` - External link clicked
- `error` - Error occurred
- `search` - Search performed

### Admin Events
- `admin_auth` - Login/logout
- `admin_tab_change` - Admin tab navigation
- `admin_album_management` - Album created/deleted
- `admin_photo_management` - Photo uploaded/deleted
- `admin_external_links_update` - External links updated
- `admin_branding_update` - Branding updated
- `admin_avatar_upload` - Avatar uploaded

## Response Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 302  | Redirect (OAuth flow) |
| 400  | Bad request (validation error) |
| 401  | Not authenticated |
| 403  | Forbidden (invalid CSRF or HMAC) |
| 404  | Resource not found |
| 500  | Server error |

## File Upload Limits

- **Photos**: Max 20 files, 50MB each
- **Avatar**: Max 5MB, single file
- **Formats**: JPEG, PNG, GIF

## Image Optimization

When photos are uploaded, the system automatically generates three versions:
- **Thumbnail**: 400x400px (for grid view)
- **Modal**: 1920px max dimension (for modal view)
- **Download**: Original quality (for downloads)

Images are optimized using ImageMagick via the `optimize_images.sh` script.

## Configuration

The API reads configuration from `/config/config.json`:

```json
{
  "development": {
    "backend": {
      "port": 3001,
      "photosDir": "photos",
      "allowedOrigins": ["http://localhost:5173"]
    }
  },
  "branding": {
    "siteName": "Ted Charles",
    "primaryColor": "#4ade80",
    ...
  },
  "analytics": {
    "openobserve": {
      "enabled": true,
      "endpoint": "https://...",
      "username": "...",
      "password": "..."
    },
    "hmacSecret": "..."
  },
  "auth": {
    "google": {
      "clientId": "...",
      "clientSecret": "..."
    },
    "authorizedEmails": ["me@tedcharles.net"]
  }
}
```

## Development

### Running the Server

```bash
cd backend
npm install
npm run dev
```

### Environment Variables

Set via `config.json` based on `NODE_ENV`:
- `NODE_ENV=development` - Uses development config
- `NODE_ENV=production` - Uses production config

### Testing Endpoints

```bash
# Health check
curl http://localhost:3001/api/health

# List albums
curl http://localhost:3001/api/albums

# Get photos
curl http://localhost:3001/api/albums/nature/photos
```

## Additional Resources

- **OpenAPI Spec**: See `openapi.yaml` for complete API specification
- **Security**: See `../SECURITY.md` for security policies
- **Frontend**: See `../frontend/` for client implementation
- **Analytics**: Frontend analytics implementation in `../frontend/src/utils/analytics.ts`

## Support

For issues or questions:
- GitHub: https://github.com/theodoreroddy/photography-website
- Email: me@tedcharles.net

