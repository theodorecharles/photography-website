/**
 * Sitemap route handler
 * Generates XML sitemap for search engines
 */

import { Router } from 'express';
import { getAllAlbums, getPublishedFolders } from '../database.js';
import { isEnvSet } from '../config.js';
import { error, warn, info, debug, verbose } from '../utils/logger.js';

const router = Router();

/**
 * Get all published albums with their folder information
 */
function getAlbumsWithFolders(): Array<{ name: string; folderId: number | null; folderName: string | null }> {
  try {
    // Get all albums and filter to published ones
    const albums = getAllAlbums()
      .filter(a => a.published && a.name !== 'homepage');
    
    // Get published folders to build folder map
    const folders = getPublishedFolders();
    const folderMap = new Map(folders.map(f => [f.id, f.name]));
    
    // Map albums with their folder names
    return albums.map(album => ({
      name: album.name,
      folderId: album.folder_id ?? null,
      folderName: album.folder_id ? (folderMap.get(album.folder_id) ?? null) : null
    }));
  } catch (err) {
    error('[Sitemap] Failed to get albums for sitemap:', err);
    return [];
  }
}

/**
 * Dynamically determine the site URL from the request
 */
function getSiteUrl(req: any): string {
  // First, try SITE_URL environment variable (set by build.js)
  if (isEnvSet(process.env.SITE_URL)) {
    return process.env.SITE_URL!;
  }
  
  // Fallback: derive from FRONTEND_DOMAIN or request
  if (isEnvSet(process.env.FRONTEND_DOMAIN)) {
    return process.env.FRONTEND_DOMAIN!;
  }
  
  // Last resort: derive from current request
  const protocol = req.protocol || 'https';
  const host = req.get('host') || 'localhost:3000';
  
  // If this is a backend domain (api.* or api-*), convert to frontend domain
  if (host.startsWith('api.') || host.startsWith('api-')) {
    const frontendHost = host.replace(/^api(-dev)?\./, 'www$1.');
    return `${protocol}://${frontendHost}`;
  }
  
  return `${protocol}://${host}`;
}

router.get('/sitemap.xml', (req, res) => {
  const albums = getAlbumsWithFolders();
  const baseUrl = getSiteUrl(req);
  const today = new Date().toISOString().split('T')[0];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/license</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

  albums.forEach(album => {
    // Build URL with folder path if album is in a folder
    let albumUrl: string;
    if (album.folderName) {
      // Album is in a folder: /album/FolderName/AlbumName
      const encodedFolder = encodeURIComponent(album.folderName);
      const encodedAlbum = encodeURIComponent(album.name);
      albumUrl = `${baseUrl}/album/${encodedFolder}/${encodedAlbum}`;
    } else {
      // Album is not in a folder: /album/AlbumName
      const encodedAlbum = encodeURIComponent(album.name);
      albumUrl = `${baseUrl}/album/${encodedAlbum}`;
    }
    
    xml += `
  <url>
    <loc>${albumUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  xml += '\n</urlset>';
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

router.get('/robots.txt', (req, res) => {
  const baseUrl = getSiteUrl(req);
  
  const robotsTxt = `User-agent: *
Disallow: /primes/

Sitemap: ${baseUrl}/sitemap.xml
`;
  
  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

export default router;

