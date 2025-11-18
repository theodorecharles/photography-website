import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourcePath = path.join(projectRoot, 'frontend', 'public', 'icon-192.png');
const faviconPngPath = path.join(projectRoot, 'frontend', 'public', 'favicon.png');
const faviconIcoPath = path.join(projectRoot, 'frontend', 'public', 'favicon.ico');

console.log('Generating favicons from icon-192.png...');
console.log(`Source: ${sourcePath}`);

try {
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

  console.log('✨ Favicon generation complete!');
} catch (error) {
  console.error('Error generating favicons:', error);
  process.exit(1);
}

