# Submit Galleria to Unraid Community Applications

## Quick Summary

Your app is ready to submit! Here's what to do:

### ✅ Already Done

- [x] Docker image on Docker Hub: `tedcharles/galleria:latest`
- [x] Template XML created: `unraid-template.xml`
- [x] Icon exists: `frontend/public/icon-512.png` (512x512 PNG)
- [x] Documentation ready: `UNRAID-SETUP.md`
- [x] README updated with Unraid install instructions

### 📋 Next Steps

1. **Commit files to GitHub:**
   ```bash
   git add unraid-template.xml UNRAID-COMMUNITY-APPS.md SUBMIT-TO-CA.md README.md
   git commit -m "Add Unraid Community Applications support"
   git push origin master
   ```

2. **Verify URLs work:**
   - Template: https://raw.githubusercontent.com/theodorecharles/Galleria/master/unraid-template.xml
   - Icon: https://raw.githubusercontent.com/theodorecharles/Galleria/master/frontend/public/icon-512.png

3. **Test locally (optional but recommended):**
   - Add template repo in Unraid Docker tab
   - Install your app from template
   - Verify it works

4. **Fork CA repository:**
   - Go to: https://github.com/Squidly271/docker-templates
   - Click "Fork"

5. **Add your template:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/docker-templates.git
   cd docker-templates
   mkdir -p tedcharles
   cp /path/to/unraid-template.xml tedcharles/galleria.xml
   git add tedcharles/galleria.xml
   git commit -m "Add Galleria - Photography Portfolio Platform"
   git push origin master
   ```

6. **Submit Pull Request:**
   - Go to your fork on GitHub
   - Click "Pull requests" → "New pull request"
   - Title: `Add Galleria - Photography Portfolio Platform`
   - Description: See `UNRAID-COMMUNITY-APPS.md` for template

7. **Wait for approval:**
   - CA maintainers will review
   - Address any feedback
   - Once merged, your app appears in Community Applications!

## Template Preview

Your template includes:

- **Name:** Galleria
- **Category:** MediaApp:Photos
- **Ports:** 3000 (frontend), 3001 (backend)
- **Volume:** `/mnt/user/appdata/galleria` → `/data`
- **Variables:**
  - `FRONTEND_DOMAIN` - Where users access the site
  - `BACKEND_DOMAIN` - API endpoint
  - `TZ` - Timezone
  - `NODE_ENV` - Production environment

## Support Links

- **Documentation:** Full guide in `UNRAID-COMMUNITY-APPS.md`
- **Testing:** See `UNRAID-SETUP.md` for detailed setup
- **Issues:** Users directed to GitHub Issues

---

**Need help?** Check the full guide: `UNRAID-COMMUNITY-APPS.md`

