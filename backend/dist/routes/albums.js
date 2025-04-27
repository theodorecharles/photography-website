import { Router } from 'express';
import fs from 'fs';
import path from 'path';
const router = Router();
// Helper function to get all albums
const getAlbums = (photosDir) => {
    try {
        return fs.readdirSync(photosDir)
            .filter(file => fs.statSync(path.join(photosDir, file)).isDirectory());
    }
    catch (error) {
        console.error('Error reading photos directory:', error);
        return [];
    }
};
// Helper function to get photos in an album
const getPhotosInAlbum = (photosDir, album) => {
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
    }
    catch (error) {
        console.error(`Error reading album ${album}:`, error);
        return [];
    }
};
// Helper function to get random photos from all albums
const getRandomPhotos = (photosDir, count) => {
    try {
        const allAlbums = getAlbums(photosDir).filter(album => album !== 'homepage');
        const selectedPhotos = [];
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
    }
    catch (error) {
        console.error('Error getting random photos:', error);
        return [];
    }
};
// Get all albums
router.get('/api/albums', (req, res) => {
    const photosDir = req.app.get('photosDir');
    const albums = getAlbums(photosDir);
    console.log('Sending albums response:', albums);
    res.json(albums);
});
// Get photos in an album
router.get('/api/albums/:album/photos', (req, res) => {
    const { album } = req.params;
    const photosDir = req.app.get('photosDir');
    console.log('Requested album:', album);
    const photos = getPhotosInAlbum(photosDir, album);
    console.log('Sending photos response:', photos);
    res.json(photos);
});
// Get random photos from all albums
router.get('/api/random-photos', (req, res) => {
    const photosDir = req.app.get('photosDir');
    const count = parseInt(req.query.count) || 2; // Default to 2 photos
    const photos = getRandomPhotos(photosDir, count);
    res.json(photos);
});
export default router;
