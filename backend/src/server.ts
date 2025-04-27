/**
 * Main server file for the photography website backend.
 * This file sets up the Express server, configures middleware,
 * and defines the main routes for the application.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import route handlers
import albumsRouter from './routes/albums.ts';
import externalPagesRouter from './routes/external-pages.ts';
import healthRouter from './routes/health.ts';

// Load environment variables from .env file
dotenv.config();

// Get the current directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express application
const app = express();
const port = process.env.PORT || 3001;

// Set up photo directories from environment variables or use defaults
const photosDir = process.env.PHOTOS_DIR || path.join(__dirname, '../../photos');
const optimizedDir = process.env.OPTIMIZED_DIR || path.join(__dirname, '../../optimized');

// Log directory paths and check if they exist
console.log('Photos directory path:', photosDir);
console.log('Optimized directory path:', optimizedDir);
console.log('Directory exists:', fs.existsSync(photosDir));
if (fs.existsSync(photosDir)) {
  console.log('Directory contents:', fs.readdirSync(photosDir));
}

// Configure middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies
app.use('/photos', express.static(photosDir)); // Serve original photos
app.use('/optimized', express.static(optimizedDir)); // Serve optimized photos

// Store directory paths in app for use in routes
app.set('photosDir', photosDir);
app.set('optimizedDir', optimizedDir);

// Register route handlers
app.use(albumsRouter);
app.use(externalPagesRouter);
app.use(healthRouter);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Photos directory: ${photosDir}`);
}); 