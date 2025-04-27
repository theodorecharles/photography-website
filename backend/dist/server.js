import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import albumsRouter from './routes/albums';
import externalPagesRouter from './routes/external-pages';
import healthRouter from './routes/health';
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
// Store directories in app for use in routes
app.set('photosDir', photosDir);
app.set('optimizedDir', optimizedDir);
// Routes
app.use(albumsRouter);
app.use(externalPagesRouter);
app.use(healthRouter);
// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Photos directory: ${photosDir}`);
});
