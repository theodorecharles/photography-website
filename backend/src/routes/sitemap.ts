/**
 * Sitemap route handler
 * Generates XML sitemap for search engines
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

function getAlbums(photosDir: string): string[] {
  try {
    return fs.readdirSync(photosDir)
      .filter(file => fs.statSync(path.join(photosDir, file)).isDirectory())
      .filter(album => album !== 'homepage');
  } catch {
    return [];
  }
}

router.get('/sitemap.xml', (req, res) => {
  const photosDir = req.app.get('photosDir');
  const albums = getAlbums(photosDir);
  
  // Get base URL from environment (set by build.js from config.json)
  if (!process.env.SITE_URL) {
    throw new Error('SITE_URL environment variable not set. This should be set from config.json');
  }
  const baseUrl = process.env.SITE_URL;
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
    // URL encode the album name and escape XML special characters
    const encodedAlbum = encodeURIComponent(album);
    const escapedAlbum = album
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    
    xml += `
  <url>
    <loc>${baseUrl}/album/${encodedAlbum}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  xml += '\n</urlset>';
  
  res.header('Content-Type', 'application/xml');
  res.send(xml);
});

export default router;

