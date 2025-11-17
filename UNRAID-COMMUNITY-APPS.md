# Submitting Galleria to Unraid Community Applications

This guide walks you through submitting Galleria to the Unraid Community Applications repository.

## Prerequisites

1. ✅ Docker image published to Docker Hub: `tedcharles/galleria:latest`
2. ✅ Template XML file created: `unraid-template.xml`
3. ✅ Icon hosted on GitHub (512x512 PNG)
4. ✅ GitHub repository public

## Step 1: Prepare Your GitHub Repository

1. **Commit the template to your repo:**
   ```bash
   git add unraid-template.xml
   git commit -m "Add Unraid Community Applications template"
   git push origin master
   ```

2. **Verify the icon is accessible:**
   - URL: https://raw.githubusercontent.com/theodorecharles/photography-website/master/frontend/public/icon-512.png
   - Must be 512x512 PNG format
   - Test in browser to ensure it loads

3. **Verify the template is accessible:**
   - URL: https://raw.githubusercontent.com/theodorecharles/photography-website/master/unraid-template.xml
   - Test in browser to ensure it loads

## Step 2: Test Your Template Locally

Before submitting, test your template on your own Unraid server:

1. **Add custom template URL:**
   - Go to Docker tab in Unraid
   - Click "Add Container"
   - Toggle "Show more settings..." at bottom
   - In "Template repositories" field, add:
     ```
     https://github.com/theodorecharles/photography-website
     ```
   - Click "Save"

2. **Test installation:**
   - Click "Add Container" again
   - Select "Galleria" from template dropdown
   - Fill in required fields
   - Click "Apply" to install
   - Verify container starts successfully
   - Test WebUI access

3. **Test both access methods:**
   - Local IP: `http://YOUR-SERVER-IP:3000`
   - Domain (with reverse proxy): `https://photos.yourdomain.com`

## Step 3: Fork the Community Applications Repository

1. **Go to the CA repository:**
   - URL: https://github.com/Squidly271/docker-templates

2. **Fork the repository:**
   - Click "Fork" button in top-right
   - This creates a copy under your GitHub account

## Step 4: Add Your Template

1. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/docker-templates.git
   cd docker-templates
   ```

2. **Create your template directory:**
   ```bash
   mkdir -p tedcharles
   ```

3. **Copy your template:**
   ```bash
   cp /path/to/your/unraid-template.xml tedcharles/galleria.xml
   ```

4. **Commit and push:**
   ```bash
   git add tedcharles/galleria.xml
   git commit -m "Add Galleria - Photography Portfolio Platform"
   git push origin master
   ```

## Step 5: Submit Pull Request

1. **Create Pull Request:**
   - Go to your forked repo on GitHub
   - Click "Pull requests" tab
   - Click "New pull request"
   - Base repository: `Squidly271/docker-templates` (base: master)
   - Head repository: `YOUR-USERNAME/docker-templates` (compare: master)
   - Click "Create pull request"

2. **Fill in PR details:**
   ```markdown
   Title: Add Galleria - Photography Portfolio Platform
   
   Description:
   Adding Galleria, a modern self-hosted photography portfolio platform.
   
   Features:
   - Self-hosted photography portfolio with React + TypeScript
   - AI-powered title generation (OpenAI GPT-4)
   - Automatic image optimization (thumbnail, modal, download sizes)
   - Album management with drag-and-drop sorting
   - Google OAuth authentication
   - MFA and Passkey support
   - Built-in analytics with visitor maps
   - Responsive design
   - Public album sharing with secret links
   
   Docker Hub: https://hub.docker.com/r/tedcharles/galleria
   GitHub: https://github.com/theodorecharles/photography-website
   Documentation: Full setup guide included in UNRAID-SETUP.md
   
   Testing: Tested on Unraid 6.12.x with both direct IP access and reverse proxy (Nginx Proxy Manager).
   ```

3. **Wait for review:**
   - CA maintainers will review your PR
   - They may request changes (follow template format, fix icon, etc.)
   - Address any feedback promptly
   - Once approved, your app will be in Community Applications!

## Step 6: After Approval

1. **Update your template URL:**
   - Users will now find your app in Community Applications
   - Your template should point to the CA repo for updates:
   ```xml
   <TemplateURL>https://raw.githubusercontent.com/Squidly271/docker-templates/master/tedcharles/galleria.xml</TemplateURL>
   ```

2. **Keep template updated:**
   - When you release new features, update the template
   - Submit new PRs to the CA repo
   - Update Docker image version tags

## Template Requirements Checklist

- [x] Container name is unique
- [x] Repository points to Docker Hub
- [x] Icon is 512x512 PNG, publicly accessible via raw GitHub URL
- [x] Overview is clear and descriptive
- [x] Category is appropriate (MediaApp:Photos)
- [x] WebUI URL format is correct
- [x] All required ports are exposed (3000, 3001)
- [x] Data directory is mapped to /mnt/user/appdata
- [x] Environment variables are documented
- [x] Template includes support and project links
- [x] Version tag is "2" (current template format)

## Common Issues

### Icon not loading
- Ensure icon is committed to master branch
- Use raw GitHub URL format
- Verify icon is 512x512 PNG

### Template not parsing
- Validate XML syntax
- Check all required fields are present
- Ensure proper escaping of special characters

### Container fails to start
- Test locally first
- Check FRONTEND_DOMAIN and BACKEND_DOMAIN are set correctly
- Verify data directory has proper permissions
- Check Unraid logs: `/var/log/docker.log`

## Additional Resources

- [Community Applications Wiki](https://forums.unraid.net/topic/38582-plug-in-community-applications/)
- [Template Creation Guide](https://forums.unraid.net/topic/57181-docker-faq/)
- [Unraid Docker Documentation](https://wiki.unraid.net/Docker_Management)

## Support

If users have issues with the template:
1. Direct them to your GitHub Issues page
2. Update the template based on common issues
3. Submit updates via PR to the CA repo

Good luck! 🚀

