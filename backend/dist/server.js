"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
const photosDir = process.env.PHOTOS_DIR || path_1.default.join(__dirname, '../../photos');
// Log the photos directory path and check if it exists
console.log('Photos directory path:', photosDir);
console.log('Directory exists:', fs_1.default.existsSync(photosDir));
if (fs_1.default.existsSync(photosDir)) {
    console.log('Directory contents:', fs_1.default.readdirSync(photosDir));
}
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/photos', express_1.default.static(photosDir));
// Helper function to get all albums
const getAlbums = () => {
    try {
        return fs_1.default.readdirSync(photosDir)
            .filter(file => fs_1.default.statSync(path_1.default.join(photosDir, file)).isDirectory());
    }
    catch (error) {
        console.error('Error reading photos directory:', error);
        return [];
    }
};
// Helper function to get photos in an album
const getPhotosInAlbum = (album) => {
    try {
        const albumPath = path_1.default.join(photosDir, album);
        return fs_1.default.readdirSync(albumPath)
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
            .map(file => ({
            id: file,
            src: `/photos/${album}/${file}`,
            thumbnail: `/photos/${album}/${file}`
        }));
    }
    catch (error) {
        console.error(`Error reading album ${album}:`, error);
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
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});
// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Photos directory: ${photosDir}`);
});
