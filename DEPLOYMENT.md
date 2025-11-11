# Deployment Guide

## 🚀 Automatic Deployment

Your photography website is set up for **zero-maintenance deployments**. Everything is automated!

## What Happens During Deployment

When you push to `main` or `master`, the GitHub Action automatically:

1. ✅ **Builds the application** (`npm run build`)
   - Compiles TypeScript backend
   - Bundles React frontend
   - **Generates static JSON files** for all albums
   - Includes service worker for caching

2. ✅ **Deploys to server** via SSH
   - Pulls latest code
   - Installs dependencies
   - Runs build process again on server
   - Regenerates static JSON (ensures fresh data)
   - Restarts PM2 processes

3. ✅ **All performance optimizations active**
   - Static JSON files ready
   - Service worker caching enabled
   - Image preloading configured

## First-Time Setup

### 1. Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```
SERVER_HOST       = your.server.com
SERVER_USER       = your-ssh-username
SSH_PRIVATE_KEY   = (your SSH private key)
DEPLOY_PATH       = /path/to/your/app
```

### 2. That's it!

Push to main and the deployment happens automatically.

## Manual Deployment

If you prefer to deploy manually:

```bash
# On your server
cd /path/to/your/app

# Pull latest code
git pull origin main

# Install dependencies
npm ci
cd backend && npm ci
cd ../frontend && npm ci
cd ..

# Build (includes static JSON generation)
npm run build

# Restart services
pm2 restart ecosystem.config.cjs
```

## Static JSON Generation

### Automatic Generation

Static JSON files are automatically regenerated when:
- ✅ Albums are created or deleted
- ✅ Photos are uploaded or deleted
- ✅ Photo order is changed
- ✅ Album order is changed
- ✅ Albums are published/unpublished

### Manual Generation

If you need to manually regenerate:

```bash
npm run generate-static-json
```

Or via API (requires admin authentication):

```bash
curl -X POST https://your-site.com/api/static-json/generate \
  -H "Cookie: your-session-cookie"
```

### Build Process

The build script (`npm run build`) automatically tries to generate static JSON:

- ✅ If database is available → generates fresh JSON files
- ✅ If database unavailable → skips gracefully (files will be generated on first album change)

## Service Worker

### Automatic Activation

The service worker activates automatically on first page load:

1. User visits your site
2. Service worker registers in background
3. On second page load, caching kicks in
4. Instant page loads from then on!

### Updates

When you deploy new code:

1. Service worker detects update
2. User sees prompt: "New content available! Refresh?"
3. On refresh, new service worker activates
4. Old cache automatically cleared

### Manual Cache Clear

Users can clear cache by running in browser console:

```javascript
if (navigator.serviceWorker.controller) {
  navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
  location.reload();
}
```

## Troubleshooting

### Static JSON not generating during build?

**Expected behavior:** The build process tries to generate static JSON, but gracefully continues if the database isn't accessible yet. Files will be auto-generated when albums are modified.

To generate after deployment:

```bash
# On server
cd /path/to/your/app
npm run generate-static-json
```

### Service worker not working?

1. Must be served over HTTPS (or localhost for testing)
2. Check browser console for errors
3. Clear browser cache and reload
4. Check DevTools → Application → Service Workers

### Performance not improved?

1. Check if static JSON files exist: `ls frontend/public/albums-data/`
2. Verify service worker is active in DevTools
3. Test on **second page load** (first load always slower)
4. Check Network tab for cached requests

## Post-Deployment Verification

### 1. Check Static JSON

```bash
# On server
ls -lh frontend/public/albums-data/
# Should see: homepage.json, _metadata.json, and one .json per album
```

### 2. Check Service Worker

Visit your site, open DevTools → Application → Service Workers
- Should show "sw.js" with status "activated"

### 3. Test Performance

1. Open DevTools → Network tab
2. Load an album page
3. Look for `/albums-data/*.json` - should load instantly
4. Reload page - images should load from cache (gray "disk cache" in Size column)

### 4. Run Lighthouse

DevTools → Lighthouse → Generate report
- Performance score should be 90+
- All metrics should be green

## Rolling Back

If you need to roll back:

```bash
# On server
cd /path/to/your/app

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild
npm run build

# Restart
pm2 restart ecosystem.config.cjs
```

## Monitoring

Check PM2 status:

```bash
pm2 status
pm2 logs
```

Check if services are running:

```bash
curl http://localhost:3001/api/health  # Backend
curl http://localhost:3000/             # Frontend
```

## Summary

✅ **Zero migration needed** - everything is automatic
✅ **Static JSON** - auto-generated during build and on album changes
✅ **Service Worker** - auto-registered on first page load
✅ **Performance** - optimizations active immediately
✅ **Updates** - handled automatically via GitHub Actions

Just push to main and everything works! 🎉

