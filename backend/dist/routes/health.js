import { Router } from 'express';
const router = Router();
// Health check endpoint
router.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});
export default router;
