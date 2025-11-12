# 🚀 Out-of-Box Setup Guide

This guide will help you set up your photography website from scratch with the new interactive setup wizard.

## Quick Start (Fresh Install)

If you just cloned this repository and want to get started quickly:

### 1. Install Dependencies

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Start Development Servers

```bash
# Option 1: Run both frontend and backend together
npm run dev

# Option 2: Run separately in different terminals
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 3. Open Your Browser

Navigate to `http://localhost:3000` and you'll automatically see the **Setup Wizard**! 🎉

The setup wizard will guide you through:
- ✅ Site name and basic information
- ✅ Email for admin access
- ✅ Color customization
- ✅ Optional Google OAuth setup
- ✅ Automatic configuration file generation
- ✅ Database creation
- ✅ Directory structure setup

## What Gets Created

After completing the setup wizard, the following will be automatically created:

1. **`config/config.json`** - Your site configuration
2. **`gallery.db`** - SQLite database for albums and metadata
3. **`photos/`** - Directory for original images
4. **`photos/homepage/`** - Default homepage album
5. **`optimized/`** - Directory for optimized images (thumbnails, modal, download sizes)

## Next Steps After Setup

### 1. Upload Your First Photos

After setup completes, you'll be redirected to the homepage. To upload photos:

1. Navigate to `/admin` (you'll see a login screen if you configured Google OAuth)
2. If you configured Google OAuth:
   - Click "Sign in with Google"
   - Use the email address you specified during setup
3. Once logged in, you'll see the Admin Portal with these tabs:
   - **Albums** - Upload and manage photos
   - **Links** - Configure external navigation links
   - **Branding** - Further customize colors and metadata
   - **Metrics** - View analytics (if configured)
   - **Settings** - Advanced configuration

### 2. Create Your First Album

In the Admin Portal:

1. Go to the **Albums** tab
2. Click "Create Album"
3. Enter an album name (e.g., "Nature", "Portfolio", "Travel")
4. Upload photos (up to 20 at a time)
5. Photos will be automatically optimized in the background
6. Toggle "Published" to make the album visible on your site

### 3. Customize Your Site

In the Admin Portal's **Branding** tab, you can:
- Update site name
- Change colors
- Upload a custom avatar
- Edit meta description and keywords
- Update favicon path

### 4. Add External Links

In the **Links** tab:
- Add links to your social media, blog, etc.
- These will appear in the site header navigation

## Skipping Google OAuth

If you didn't configure Google OAuth during setup, you can add it later:

1. Get OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)
2. Edit `config/config.json`
3. Update the `environment.auth.google` section:
   ```json
   {
     "environment": {
       "auth": {
         "google": {
           "clientId": "your-client-id.apps.googleusercontent.com",
           "clientSecret": "GOCSPX-your-client-secret"
         }
       }
     }
   }
   ```
4. Restart the backend server

### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Add authorized redirect URI:
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://api.yourdomain.com/api/auth/google/callback`
7. Copy the Client ID and Client Secret

## Testing the Onboarding Flow

To test the setup wizard from scratch:

```bash
# 1. Remove existing configuration and database
rm -f config/config.json
rm -f gallery.db
rm -rf photos
rm -rf optimized

# 2. Start the development server
npm run dev

# 3. Open http://localhost:3000
# You should see the setup wizard!
```

## Manual Configuration (Alternative)

If you prefer to configure manually instead of using the setup wizard:

```bash
# 1. Copy the example config
cp config/config.example.json config/config.json

# 2. Edit config/config.json with your settings
# - Update branding.siteName
# - Add your email to environment.auth.authorizedEmails
# - Generate a secure session secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# - Update environment.auth.sessionSecret

# 3. Create directories
mkdir -p photos/homepage
mkdir -p optimized

# 4. Start the server - database will be created automatically
npm run dev
```

## Troubleshooting

### Setup wizard doesn't appear
- Make sure you've removed or renamed `config/config.json`
- Check browser console for errors
- Verify backend is running on port 3001

### "Setup mode detected" message in backend logs
- This is normal! It means the setup wizard is active
- Backend will operate in safe mode until configuration is complete

### Can't access admin panel
- Verify your email is in `authorizedEmails` in config.json
- Check that Google OAuth credentials are correct
- Clear browser cookies and try again

### Images not optimizing
After uploading photos, optimization runs in the background. Check:
- Backend terminal for optimization progress
- Admin portal for the optimization toast notification
- Refresh the page after optimization completes

## Architecture Overview

The setup wizard:
- **Backend**: `/api/setup/status` and `/api/setup/initialize` endpoints
- **Frontend**: `SetupWizard` component shown when setup incomplete
- **Auto-detection**: Checks for config.json, database, and proper configuration
- **Safe mode**: Backend runs with minimal config until setup complete
- **Database migrations**: Automatically creates/updates database schema

## Configuration Structure

Your `config.json` will contain:

```json
{
  "environment": {
    "frontend": { "port": 3000, "apiUrl": "http://localhost:3001" },
    "backend": { "port": 3001, "photosDir": "photos", "allowedOrigins": [...] },
    "optimization": { ... },
    "security": { ... },
    "auth": { "google": {...}, "sessionSecret": "...", "authorizedEmails": [...] }
  },
  "branding": { "siteName": "...", "primaryColor": "...", ... },
  "analytics": { ... },
  "ai": { ... },
  "notifications": { ... },
  "externalLinks": [...]
}
```

## Security Notes

- The setup wizard generates a cryptographically secure session secret automatically
- Never commit `config/config.json` to version control (it's in `.gitignore`)
- Change the session secret in production
- Use HTTPS in production (automatically enforced)

## Production Deployment

After local setup, deploy to production:

1. Update `config.json` with production URLs
2. Follow the main [README.md](README.md) deployment instructions
3. The setup wizard will not appear in production (setup is already complete)

## Need Help?

- 📚 [Main Documentation](README.md)
- 🐛 [Report Issues](https://github.com/theodoreroddy/photography-website/issues)
- 📧 [Contact](mailto:me@tedcharles.net)

---

**Enjoy building your photography portfolio! 📸**

