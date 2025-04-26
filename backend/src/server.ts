import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;
const photosDir = process.env.PHOTOS_DIR || path.join(__dirname, '../../photos');
const optimizedDir = process.env.OPTIMIZED_DIR || path.join(__dirname, '../../optimized');

// Log the photos directory path and check if it exists
console.log('Photos directory path:', photosDir);
console.log('Optimized directory path:', optimizedDir);
console.log('Directory exists:', fs.existsSync(photosDir));
if (fs.existsSync(photosDir)) {
  console.log('Directory contents:', fs.readdirSync(photosDir));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/photos', express.static(photosDir));
app.use('/optimized', express.static(optimizedDir));

// Helper function to get all albums
const getAlbums = () => {
  try {
    return fs.readdirSync(photosDir)
      .filter(file => fs.statSync(path.join(photosDir, file)).isDirectory());
  } catch (error) {
    console.error('Error reading photos directory:', error);
    return [];
  }
};

// Helper function to get photos in an album
const getPhotosInAlbum = (album: string) => {
  try {
    const albumPath = path.join(photosDir, album);
    const files = fs.readdirSync(albumPath)
      .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

    // Special handling for homepage album
    if (album === 'homepage') {
      return files.map(file => ({
        id: file,
        src: `/optimized/modal/${album}/${file}`,
        thumbnail: `/optimized/thumbnail/${album}/${file}`,
        download: `/optimized/download/${album}/${file}`
      }));
    }

    // For other albums, use original photos
    return files.map(file => ({
      id: file,
      src: `/photos/${album}/${file}`,
      thumbnail: `/photos/${album}/${file}`,
      download: `/photos/${album}/${file}`
    }));
  } catch (error) {
    console.error(`Error reading album ${album}:`, error);
    return [];
  }
};

// Helper function to get external pages
const getExternalPages = () => {
  try {
    const configPath = path.join(__dirname, '../../config/external-pages.json');
    const data = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading external pages config:', error);
    return { externalLinks: [] };
  }
};

// Get all albums
app.get('/api/albums', (req, res) => {
  const albums = getAlbums();
  console.log('Sending albums response:', albums);
  res.json(albums);
});

// Get photos in an album
app.get('/api/albums/:album/photos', (req, res) => {
  const { album } = req.params;
  console.log('Requested album:', album);
  const photos = getPhotosInAlbum(album);
  console.log('Sending photos response:', photos);
  res.json(photos);
});

// Get external pages
app.get('/api/external-pages', (req, res) => {
  const externalPages = getExternalPages();
  console.log('Sending external pages response:', externalPages);
  res.json(externalPages);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Photos directory: ${photosDir}`);
}); 