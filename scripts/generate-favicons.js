import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const defaultIconsDir = path.join(projectRoot, 'config', 'icons');
const publicDir = path.join(projectRoot, 'frontend', 'public');

// Icon files to copy if they don't exist
const iconFiles = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

console.log('🎨 Setting up icons and favicons...');

try {
  // Copy default icons if they don't exist in public directory
  for (const iconFile of iconFiles) {
    const defaultPath = path.join(defaultIconsDir, iconFile);
    const publicPath = path.join(publicDir, iconFile);
    
    if (!fs.existsSync(publicPath)) {
      if (fs.existsSync(defaultPath)) {
        fs.copyFileSync(defaultPath, publicPath);
        console.log(`✓ Copied default ${iconFile}`);
      } else {
        console.warn(`⚠️  Default ${iconFile} not found in config/icons/`);
      }
    }
  }

  // Generate favicons from icon-192.png ONLY if they don't exist
  const sourcePath = path.join(publicDir, 'icon-192.png');
  const faviconPngPath = path.join(publicDir, 'favicon.png');
  const faviconIcoPath = path.join(publicDir, 'favicon.ico');

  // Check if favicons already exist (don't overwrite custom avatars)
  if (fs.existsSync(faviconPngPath) && fs.existsSync(faviconIcoPath)) {
    console.log('✓ Favicons already exist, skipping generation (preserving custom favicon)');
  } else {
    if (!fs.existsSync(sourcePath)) {
      console.error('❌ icon-192.png not found! Cannot generate favicons.');
      process.exit(1);
    }

    console.log('🔄 Generating favicons from icon-192.png...');

    // Generate 512x512 PNG favicon
    await sharp(sourcePath)
      .resize(512, 512, { fit: 'cover' })
      .png()
      .toFile(faviconPngPath);
    console.log(`✓ Generated favicon.png (512x512)`);

    // Generate 32x32 ICO favicon
    await sharp(sourcePath)
      .resize(32, 32, { fit: 'cover' })
      .toFormat('png')
      .toFile(faviconIcoPath);
    console.log(`✓ Generated favicon.ico (32x32)`);
  }

  console.log('✨ Icon setup and favicon generation complete!');
} catch (error) {
  console.error('Error setting up icons/favicons:', error);
  process.exit(1);
}

