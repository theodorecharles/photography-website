import express from 'express';
import type { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

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

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

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

    // Use optimized images for all albums
    return files.map(file => ({
      id: file,
      src: `/optimized/modal/${album}/${file}`,
      thumbnail: `/optimized/thumbnail/${album}/${file}`,
      download: `/optimized/download/${album}/${file}`
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

// Helper function to get random photos from all albums
const getRandomPhotos = (count: number) => {
  try {
    const allAlbums = getAlbums().filter(album => album !== 'homepage');
    const selectedPhotos: { id: string; src: string; thumbnail: string; download: string; album: string }[] = [];

    // Get 2 random photos from each album
    allAlbums.forEach(album => {
      const albumPath = path.join(photosDir, album);
      const files = fs.readdirSync(albumPath)
        .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));

      // Shuffle the files array and take up to 2 photos
      const shuffledFiles = files.sort(() => 0.5 - Math.random());
      const selectedFiles = shuffledFiles.slice(0, count);

      selectedFiles.forEach(file => {
        selectedPhotos.push({
          id: file,
          src: `/optimized/modal/${album}/${file}`,
          thumbnail: `/optimized/thumbnail/${album}/${file}`,
          download: `/optimized/download/${album}/${file}`,
          album: album
        });
      });
    });

    // Sort all photos alphabetically by filename
    return selectedPhotos.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Error getting random photos:', error);
    return [];
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

// Get random photos from all albums
app.get('/api/random-photos', (req, res) => {
  const count = parseInt(req.query.count as string) || 2; // Default to 2 photos
  const photos = getRandomPhotos(count);
  res.json(photos);
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