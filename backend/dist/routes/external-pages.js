import { Router } from 'express';
import fs from 'fs';
import path from 'path';
const router = Router();
// Helper function to get external pages
const getExternalPages = () => {
    try {
        const configPath = path.join(process.cwd(), '../../config/external-pages.json');
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('Error reading external pages config:', error);
        return { externalLinks: [] };
    }
};
// Get external pages
router.get('/api/external-pages', (req, res) => {
    const externalPages = getExternalPages();
    console.log('Sending external pages response:', externalPages);
    res.json(externalPages);
});
export default router;
