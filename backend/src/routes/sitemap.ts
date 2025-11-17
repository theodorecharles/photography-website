/**
 * Sitemap route handler
 * Generates XML sitemap for search engines
 */

import { Router } from 'express';
import { getPublishedAlbums } from '../database.js';
import { isEnvSet } from '../config.js';

const router = Router();

/**
 * Get all published album names from database
 */
function getAlbums(): string[] {
  try {
    return getPublishedAlbums()
      .map(a => a.name)
      .filter(name => name !== 'homepage');
  } catch (error) {
    console.error('Error getting albums for sitemap:', error);
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
  const albums = getAlbums();
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

