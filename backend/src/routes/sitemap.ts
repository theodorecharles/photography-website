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
  const baseUrl = 'https://tedcharles.net';
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
    xml += `
  <url>
    <loc>${baseUrl}/album/${album}</loc>
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

