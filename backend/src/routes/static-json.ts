/**
 * Route handler for static JSON generation.
 * Generates static JSON files for all albums to improve frontend loading performance.
 */

import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { getAllAlbums, getImagesInAlbum, getImagesFromPublishedAlbums } from "../database.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * Get the output directory for static JSON files
 */
function getOutputDir(appRoot: string): string {
  return path.join(appRoot, 'frontend', 'public', 'albums-data');
}

/**
 * Ensure output directory exists
 */
function ensureOutputDir(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`[Static JSON] Created output directory: ${outputDir}`);
  }
}

/**
 * Write JSON file
 */
function writeJSON(outputDir: string, filename: string, data: any): void {
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`[Static JSON] Generated: ${filename} (${Array.isArray(data) ? data.length : 'N/A'} items)`);
}

/**
 * Transform database image to photo object
 */
function transformImageToPhoto(img: any, album: string) {
  const defaultTitle = img.filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[-_]/g, ' '); // Replace hyphens and underscores with spaces

  return {
    id: `${album}/${img.filename}`,
    title: img.title || defaultTitle,
    album: album,
    src: `/optimized/modal/${album}/${img.filename}`,
    thumbnail: `/optimized/thumbnail/${album}/${img.filename}`,
    download: `/optimized/download/${album}/${img.filename}`,
    sort_order: img.sort_order ?? null,
  };
}

/**
 * Generate static JSON files for all albums
 */
export function generateStaticJSONFiles(appRoot: string): { success: boolean; error?: string; albumCount?: number } {
  try {
    const outputDir = getOutputDir(appRoot);
    ensureOutputDir(outputDir);

    // Get all albums
    const albums = getAllAlbums();
    console.log(`[Static JSON] Found ${albums.length} albums`);

    // Generate JSON for each album
    for (const album of albums) {
      try {
        const images = getImagesInAlbum(album);
        const photos = images.map((img) => transformImageToPhoto(img, album));
        writeJSON(outputDir, `${album}.json`, photos);
      } catch (error) {
        console.error(`[Static JSON] Error generating JSON for album "${album}":`, error);
      }
    }

    // Generate homepage JSON (random photos from all published albums)
    try {
      const publishedImages = getImagesFromPublishedAlbums();
      
      // Shuffle using Fisher-Yates algorithm
      const shuffled = [...publishedImages];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Take first 50 photos
      const randomPhotos = shuffled.slice(0, 50).map((img) => 
        transformImageToPhoto(img, img.album)
      );
      
      writeJSON(outputDir, 'homepage.json', randomPhotos);
    } catch (error) {
      console.error('[Static JSON] Error generating homepage.json:', error);
    }

    // Generate albums list
    writeJSON(outputDir, 'albums-list.json', albums);

    // Generate metadata file
    const metadata = {
      generatedAt: new Date().toISOString(),
      albumCount: albums.length,
      albums: albums
    };
    writeJSON(outputDir, '_metadata.json', metadata);

    console.log(`[Static JSON] ✓ Generation complete! (${albums.length} albums)`);
    return { success: true, albumCount: albums.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Static JSON] ✗ Generation failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * POST /api/static-json/generate
 * Trigger static JSON generation (admin only)
 */
router.post("/generate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  console.log('[Static JSON] Manual generation triggered');
  
  const appRoot = req.app.get('appRoot');
  const result = generateStaticJSONFiles(appRoot);
  
  if (result.success) {
    res.json({ 
      success: true, 
      message: `Generated static JSON for ${result.albumCount} albums`,
      albumCount: result.albumCount
    });
  } else {
    res.status(500).json({ 
      success: false, 
      error: result.error 
    });
  }
});

/**
 * GET /api/static-json/status
 * Get status of static JSON files
 */
router.get("/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const appRoot = req.app.get('appRoot');
    const outputDir = getOutputDir(appRoot);
    const metadataPath = path.join(outputDir, '_metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      res.json({ 
        exists: false,
        message: 'Static JSON files have not been generated yet'
      });
      return;
    }
    
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    res.json({ 
      exists: true,
      ...metadata
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to read static JSON status' 
    });
  }
});

export default router;

