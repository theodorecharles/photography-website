# 🚀 Getting Started - Fresh Installation

Welcome! This is your **step-by-step guide** to get your photography website running from scratch.

## ⚡ Quick Start (Recommended)

Since you just cloned this repo, follow these simple steps:

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### 2. Start the Development Server

```bash
npm run dev
```

This will start both the backend (port 3001) and frontend (port 3000).

### 3. Open Your Browser

Navigate to: **http://localhost:3000**

🎉 **The Setup Wizard will automatically appear!**

## 📋 Setup Wizard Walkthrough

The setup wizard will guide you through 3 easy steps:

### Step 1: Basic Information
- **Site Name**: Your name or portfolio name (e.g., "John Doe Photography")
- **Email**: Your email address (will have admin access)
- **Description**: Brief description of your site (optional)

### Step 2: Customization
- **Primary Color**: Choose your brand's primary color
- **Secondary Color**: Choose your accent color
- **Google OAuth** (Optional): Skip this for now, you can add it later

### Step 3: Complete!
- Configuration file created
- Database initialized
- Directories created
- Ready to upload photos!

## 📸 What to Do Next

After the setup wizard completes:

### 1. Access Admin Panel

Navigate to: **http://localhost:3000/admin**

If you configured Google OAuth:
- Click "Sign in with Google"
- Use the email you specified during setup

If you skipped Google OAuth:
- You can add it later (see below)

### 2. Upload Your First Album

In the Admin Panel:
1. Go to the **Albums** tab
2. Click **"Create Album"**
3. Enter album name (e.g., "Portfolio", "Nature", "Travel")
4. Click **"Upload Photos"**
5. Select up to 20 images
6. Wait for optimization to complete (watch the toast notification)
7. Toggle **"Published"** to make the album visible

### 3. View Your Gallery

Go back to the homepage: **http://localhost:3000**

Your album will appear in the navigation!

## 🔧 Optional: Add Google OAuth Later

If you skipped Google OAuth during setup, you can add it later:

### Get OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
5. Copy the Client ID and Client Secret

### Update Config

Edit `config/config.json`:

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

Restart the server:
```bash
# Stop the server (Ctrl+C)
npm run dev
```

## 📁 What Was Created

The setup wizard created these files and directories:

```
photography-website/
├── config/
│   └── config.json          ✨ Your configuration (auto-generated)
├── gallery.db               ✨ SQLite database (auto-generated)
├── photos/                  ✨ Original photos directory
│   └── homepage/           ✨ Default album
└── optimized/              ✨ Optimized images (thumbnails, modal, download)
```

## 🎨 Customize Your Site

### Via Admin Panel (Recommended)

Go to **Admin → Branding** tab:
- Update site name
- Change colors
- Edit meta description
- Upload custom avatar
- Update favicon

### Via Config File (Advanced)

Edit `config/config.json` directly for advanced settings:
- Analytics integration (OpenObserve)
- AI title generation (OpenAI)
- Telegram notifications
- Rate limiting
- Optimization settings

See [Configuration](README.md#configuration) in README for details.

## 🧪 Testing the Setup Flow Again

Want to test the setup wizard again?

```bash
# Use the provided test script
./test-setup-wizard.sh

# Or manually:
rm config/config.json
rm gallery.db
rm -rf photos optimized

# Then restart:
npm run dev
```

## 🚨 Troubleshooting

### Setup Wizard Doesn't Appear

**Issue**: I see the normal homepage, not the setup wizard

**Solution**: Make sure you don't have `config/config.json`. Remove it:
```bash
rm config/config.json
```

### Backend Won't Start

**Issue**: Backend crashes on startup

**Solutions**:
1. Check port 3001 isn't already in use:
   ```bash
   lsof -i :3001
   kill -9 <PID>
   ```

2. Check you have Node.js 18+:
   ```bash
   node --version
   ```

3. Reinstall dependencies:
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   ```

### Frontend Won't Start

**Issue**: Frontend crashes on startup

**Solutions**:
1. Check port 3000 isn't already in use:
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

2. Reinstall dependencies:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

### Can't Access Admin Panel

**Issue**: Admin panel shows login but I can't log in

**Solutions**:
1. If you configured Google OAuth:
   - Verify credentials in `config/config.json`
   - Check redirect URI matches: `http://localhost:3001/api/auth/google/callback`
   - Verify your email is in `authorizedEmails` array

2. If you skipped Google OAuth:
   - You need to add OAuth credentials first (see above)

### Images Not Showing

**Issue**: Uploaded photos don't appear

**Solutions**:
1. Wait for optimization to complete (check toast notification)
2. Refresh the page after optimization completes
3. Check browser console for errors
4. Verify `optimized/` directory was created

## 📚 More Resources

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Detailed setup documentation
- **[ONBOARDING_SUMMARY.md](ONBOARDING_SUMMARY.md)** - Technical implementation details
- **[README.md](README.md)** - Complete documentation
- **[GitHub Issues](https://github.com/theodoreroddy/photography-website/issues)** - Report bugs or request features

## 🎯 Next Steps

1. ✅ Complete setup wizard
2. ✅ Upload your first album
3. ✅ Customize branding
4. 🎨 Add more albums
5. 🔗 Configure external links
6. 📊 Set up analytics (optional)
7. 🤖 Enable AI titles (optional)
8. 🚀 Deploy to production

## 💡 Tips

- Start with a small album (5-10 photos) to test the workflow
- Use the "homepage" album for featured photos that appear on the main page
- You can drag-and-drop to reorder photos in the admin panel
- Use the share link feature to share private albums with clients
- Enable "auto-generate titles" in settings for AI-powered photo descriptions

## 🎉 You're All Set!

Enjoy building your photography portfolio! If you need help:

- 📧 Email: [me@tedcharles.net](mailto:me@tedcharles.net)
- 🐛 Issues: [GitHub Issues](https://github.com/theodoreroddy/photography-website/issues)
- 📖 Docs: [README.md](README.md)

**Happy photographing! 📸✨**

