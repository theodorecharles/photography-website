/**
 * Video Serving Routes
 * Serves HLS playlists and segments for video playback
 */

import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { error, info } from '../utils/logger.js';

const router = Router();

/**
 * Sanitize path components to prevent directory traversal
 */
const sanitizePath = (name: string): string | null => {
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return null;
  }
  if (!/^[a-zA-Z0-9_\-. ]+$/.test(name)) {
    return null;
  }
  return name;
};

/**
 * Serve master HLS playlist for a video (adaptive streaming)
 * GET /api/video/:album/:filename/master.m3u8
 */
router.get("/:album/:filename/master.m3u8", async (req: Request, res: Response): Promise<void> => {
  try {
    const { album, filename } = req.params;

    // Sanitize inputs
    const sanitizedAlbum = sanitizePath(album);
    const sanitizedFilename = sanitizePath(filename);

    if (!sanitizedAlbum || !sanitizedFilename) {
      res.status(400).json({ error: 'Invalid path parameters' });
      return;
    }

    const videoDir = req.app.get("videoDir");
    if (!videoDir) {
      error('[Video] videoDir not configured');
      res.status(500).json({ error: 'Video directory not configured' });
      return;
    }

    const masterPlaylistPath = path.join(
      videoDir,
      sanitizedAlbum,
      sanitizedFilename,
      'master.m3u8'
    );

    // Check if master playlist exists
    if (!fs.existsSync(masterPlaylistPath)) {
      res.status(404).json({ error: 'Master playlist not found' });
      return;
    }

    // Set appropriate headers for HLS
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send the master playlist file
    res.sendFile(masterPlaylistPath);
  } catch (err) {
    error('[Video] Failed to serve master playlist:', err);
    res.status(500).json({ error: 'Failed to serve master playlist' });
  }
});

/**
 * Serve HLS playlist for a video (individual resolution)
 * GET /api/video/:album/:filename/:resolution/playlist.m3u8
 */
router.get("/:album/:filename/:resolution/playlist.m3u8", async (req: Request, res: Response): Promise<void> => {
  try {
    const { album, filename, resolution } = req.params;

    // Sanitize inputs
    const sanitizedAlbum = sanitizePath(album);
    const sanitizedFilename = sanitizePath(filename);
    const sanitizedResolution = sanitizePath(resolution);

    if (!sanitizedAlbum || !sanitizedFilename || !sanitizedResolution) {
      res.status(400).json({ error: 'Invalid path parameters' });
      return;
    }

    // Validate resolution
    if (!['240p', '360p', '720p', '1080p'].includes(sanitizedResolution)) {
      res.status(400).json({ error: 'Invalid resolution' });
      return;
    }

    const videoDir = req.app.get("videoDir");
    if (!videoDir) {
      error('[Video] videoDir not configured');
      res.status(500).json({ error: 'Video directory not configured' });
      return;
    }

    const playlistPath = path.join(
      videoDir,
      sanitizedAlbum,
      sanitizedFilename,
      sanitizedResolution,
      'playlist.m3u8'
    );

    // Check if playlist exists
    if (!fs.existsSync(playlistPath)) {
      res.status(404).json({ error: 'Playlist not found' });
      return;
    }

    // Set appropriate headers for HLS
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send the playlist file
    res.sendFile(playlistPath);
  } catch (err) {
    error('[Video] Failed to serve playlist:', err);
    res.status(500).json({ error: 'Failed to serve playlist' });
  }
});

/**
 * Serve HLS segment for a video
 * GET /api/video/:album/:filename/:resolution/:segment
 */
router.get("/:album/:filename/:resolution/:segment", async (req: Request, res: Response): Promise<void> => {
  try {
    const { album, filename, resolution, segment } = req.params;

    // Sanitize inputs
    const sanitizedAlbum = sanitizePath(album);
    const sanitizedFilename = sanitizePath(filename);
    const sanitizedResolution = sanitizePath(resolution);
    const sanitizedSegment = sanitizePath(segment);

    if (!sanitizedAlbum || !sanitizedFilename || !sanitizedResolution || !sanitizedSegment) {
      res.status(400).json({ error: 'Invalid path parameters' });
      return;
    }

    // Validate resolution
    if (!['240p', '360p', '720p', '1080p'].includes(sanitizedResolution)) {
      res.status(400).json({ error: 'Invalid resolution' });
      return;
    }

    // Validate segment filename (must be .ts file)
    if (!sanitizedSegment.endsWith('.ts')) {
      res.status(400).json({ error: 'Invalid segment file' });
      return;
    }

    const videoDir = req.app.get("videoDir");
    if (!videoDir) {
      error('[Video] videoDir not configured');
      res.status(500).json({ error: 'Video directory not configured' });
      return;
    }

    const segmentPath = path.join(
      videoDir,
      sanitizedAlbum,
      sanitizedFilename,
      sanitizedResolution,
      sanitizedSegment
    );

    // Check if segment exists
    if (!fs.existsSync(segmentPath)) {
      res.status(404).json({ error: 'Segment not found' });
      return;
    }

    // Set appropriate headers for MPEG-TS segments
    res.setHeader('Content-Type', 'video/mp2t');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache segments for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send the segment file
    res.sendFile(segmentPath);
  } catch (err) {
    error('[Video] Failed to serve segment:', err);
    res.status(500).json({ error: 'Failed to serve segment' });
  }
});

/**
 * Get available resolutions for a video
 * GET /api/video/:album/:filename/resolutions
 */
router.get("/:album/:filename/resolutions", async (req: Request, res: Response): Promise<void> => {
  try {
    const { album, filename } = req.params;

    // Sanitize inputs
    const sanitizedAlbum = sanitizePath(album);
    const sanitizedFilename = sanitizePath(filename);

    if (!sanitizedAlbum || !sanitizedFilename) {
      res.status(400).json({ error: 'Invalid path parameters' });
      return;
    }

    const videoDir = req.app.get("videoDir");
    if (!videoDir) {
      error('[Video] videoDir not configured');
      res.status(500).json({ error: 'Video directory not configured' });
      return;
    }

    const videoPath = path.join(videoDir, sanitizedAlbum, sanitizedFilename);

    // Check if video directory exists
    if (!fs.existsSync(videoPath)) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    // Check which resolution directories exist
    const availableResolutions: string[] = [];
    const possibleResolutions = ['240p', '360p', '720p', '1080p'];

    for (const resolution of possibleResolutions) {
      const resolutionPath = path.join(videoPath, resolution, 'playlist.m3u8');
      if (fs.existsSync(resolutionPath)) {
        availableResolutions.push(resolution);
      }
    }

    if (availableResolutions.length === 0) {
      res.status(404).json({ error: 'No video resolutions available' });
      return;
    }

    res.json({
      album: sanitizedAlbum,
      filename: sanitizedFilename,
      resolutions: availableResolutions
    });
  } catch (err) {
    error('[Video] Failed to get resolutions:', err);
    res.status(500).json({ error: 'Failed to get resolutions' });
  }
});

export default router;
