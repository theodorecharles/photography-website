/**
 * Video Processing Module
 * Handles video rotation, HLS encoding, and thumbnail generation
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { info, error, warn } from './logger.js';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);
const writeFile = promisify(fs.writeFile);

export interface VideoResolution {
  name: string;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
}

export interface VideoProcessingProgress {
  stage: 'rotation' | '240p' | '360p' | '720p' | '1080p' | 'thumbnail' | 'modal-preview';
  progress: number;
  message: string;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  rotation: number;
}

/**
 * Get video metadata using ffprobe
 */
export async function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,duration,rotation',
      '-show_entries', 'format=duration',
      '-of', 'json',
      videoPath
    ];

    const ffprobe = spawn('ffprobe', args);
    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed: ${stderr}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const stream = data.streams[0];
        const format = data.format;

        resolve({
          width: stream.width || 1920,
          height: stream.height || 1080,
          duration: parseFloat(stream.duration || format.duration || '0'),
          rotation: stream.rotation || 0
        });
      } catch (err) {
        reject(new Error(`Failed to parse ffprobe output: ${err}`));
      }
    });
  });
}

/**
 * Rotate video if needed (based on metadata)
 */
export async function rotateVideo(
  inputPath: string,
  outputPath: string,
  metadata: VideoMetadata,
  onProgress?: (progress: number) => void
): Promise<void> {
  // If no rotation needed, just copy the file
  if (!metadata.rotation || metadata.rotation === 0) {
    info('[VideoProcessor] No rotation needed, copying file');
    await fs.promises.copyFile(inputPath, outputPath);
    if (onProgress) onProgress(100);
    return;
  }

  return new Promise((resolve, reject) => {
    let transpose = '';
    
    // Convert rotation to transpose filter
    // 90 degrees clockwise = transpose=1
    // 90 degrees counter-clockwise = transpose=2
    // 180 degrees = transpose=1,transpose=1
    switch (metadata.rotation) {
      case 90:
        transpose = 'transpose=1';
        break;
      case -90:
      case 270:
        transpose = 'transpose=2';
        break;
      case 180:
      case -180:
        transpose = 'transpose=1,transpose=1';
        break;
      default:
        // Unknown rotation, just copy
        fs.promises.copyFile(inputPath, outputPath)
          .then(() => resolve())
          .catch(reject);
        return;
    }

    const args = [
      '-i', inputPath,
      '-vf', transpose,
      '-c:a', 'copy',
      '-metadata:s:v:0', 'rotate=0',
      '-y',
      outputPath
    ];

    info(`[VideoProcessor] Rotating video ${metadata.rotation} degrees`);
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      
      // Parse progress from ffmpeg output
      if (onProgress && metadata.duration > 0) {
        const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseFloat(timeMatch[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          const progress = Math.min(99, (currentTime / metadata.duration) * 100);
          onProgress(progress);
        }
      }
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        error('[VideoProcessor] Rotation failed:', stderr);
        reject(new Error(`Video rotation failed: ${stderr}`));
      } else {
        if (onProgress) onProgress(100);
        resolve();
      }
    });
  });
}

/**
 * Generate HLS playlist for a specific resolution
 */
export async function generateHLS(
  inputPath: string,
  outputDir: string,
  resolution: VideoResolution,
  onProgress?: (progress: number) => void
): Promise<void> {
  // Create output directory
  await mkdir(outputDir, { recursive: true });

  return new Promise((resolve, reject) => {
    const playlistPath = path.join(outputDir, 'playlist.m3u8');
    const segmentPattern = path.join(outputDir, 'segment%03d.ts');

    const args = [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', resolution.height >= 720 ? 'medium' : 'fast',
      '-crf', resolution.height >= 1080 ? '23' : resolution.height >= 720 ? '25' : '28',
      '-vf', `scale=-2:${resolution.height}`,
      '-b:v', resolution.videoBitrate,
      '-maxrate', resolution.videoBitrate,
      '-bufsize', `${parseInt(resolution.videoBitrate) * 2}k`,
      '-c:a', 'aac',
      '-b:a', resolution.audioBitrate,
      '-ac', '2',
      '-f', 'hls',
      '-hls_time', '4',  // 4-second segments (better for streaming performance)
      '-hls_list_size', '0',
      '-hls_segment_filename', segmentPattern,
      '-y',
      playlistPath
    ];

    info(`[VideoProcessor] Generating ${resolution.name} HLS playlist`);
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';
    let duration = 0;

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      
      // Extract duration from ffmpeg output
      if (duration === 0) {
        const durationMatch = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          duration = hours * 3600 + minutes * 60 + seconds;
        }
      }
      
      // Parse progress from ffmpeg output
      if (onProgress && duration > 0) {
        const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseFloat(timeMatch[3]);
          const currentTime = hours * 3600 + minutes * 60 + seconds;
          const progress = Math.min(99, (currentTime / duration) * 100);
          onProgress(progress);
        }
      }
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        error(`[VideoProcessor] HLS generation failed for ${resolution.name}:`, stderr);
        reject(new Error(`HLS generation failed: ${stderr}`));
      } else {
        if (onProgress) onProgress(100);
        info(`[VideoProcessor] ${resolution.name} HLS playlist generated successfully`);
        resolve();
      }
    });
  });
}

/**
 * Extract a thumbnail from the video
 */
export async function extractThumbnail(
  videoPath: string,
  outputPath: string,
  size: number,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', videoPath,
      '-ss', '00:00:01',
      '-vframes', '1',
      '-vf', `scale=${size}:-2`,
      '-y',
      outputPath
    ];

    info(`[VideoProcessor] Extracting ${size}px thumbnail`);
    const ffmpeg = spawn('ffmpeg', args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      if (onProgress) onProgress(50); // Simple progress indication
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        error('[VideoProcessor] Thumbnail extraction failed:', stderr);
        reject(new Error(`Thumbnail extraction failed: ${stderr}`));
      } else {
        if (onProgress) onProgress(100);
        info(`[VideoProcessor] ${size}px thumbnail extracted successfully`);
        resolve();
      }
    });
  });
}

/**
 * Process a video: rotate, generate HLS playlists, and extract thumbnails
 */
export async function processVideo(
  inputPath: string,
  album: string,
  filename: string,
  dataDir: string,
  onProgress?: (update: VideoProcessingProgress) => void
): Promise<void> {
  const videoDir = path.join(dataDir, 'video', album, filename);
  const optimizedDir = path.join(dataDir, 'optimized');
  
  // Create directories
  await mkdir(videoDir, { recursive: true });
  await mkdir(path.join(optimizedDir, 'thumbnail', album), { recursive: true });
  await mkdir(path.join(optimizedDir, 'modal', album), { recursive: true });

  try {
    // Step 1: Get video metadata
    info('[VideoProcessor] Getting video metadata');
    const metadata = await getVideoMetadata(inputPath);
    
    // Step 2: Rotate video if needed
    if (onProgress) {
      onProgress({
        stage: 'rotation',
        progress: 0,
        message: 'Checking rotation...'
      });
    }
    
    const rotatedPath = path.join(videoDir, 'rotated.mp4');
    await rotateVideo(inputPath, rotatedPath, metadata, (progress) => {
      if (onProgress) {
        onProgress({
          stage: 'rotation',
          progress,
          message: 'Rotating video...'
        });
      }
    });

    // Step 3: Generate HLS playlists for different resolutions
    // Load resolution settings from config
    const configPath = path.join(dataDir, 'config.json');
    let resolutionConfig: any = null;
    
    try {
      const configData = await fs.promises.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      resolutionConfig = config.environment?.optimization?.video?.resolutions;
    } catch (err) {
      warn('[VideoProcessor] Could not load video config from config.json, trying defaults');
    }

    // If config.json doesn't have video settings, try config.defaults.json
    if (!resolutionConfig) {
      try {
        const defaultsPath = path.join(dataDir, '..', 'config', 'config.defaults.json');
        const defaultsData = await fs.promises.readFile(defaultsPath, 'utf-8');
        const defaults = JSON.parse(defaultsData);
        resolutionConfig = defaults.environment?.optimization?.video?.resolutions;
        info('[VideoProcessor] Using default video config from config.defaults.json');
      } catch (err) {
        error('[VideoProcessor] Failed to load video config from defaults:', err);
        throw new Error('Video configuration not found in config.json or config.defaults.json');
      }
    }

    if (!resolutionConfig) {
      throw new Error('No video resolutions configured');
    }

    // Build resolutions array from config (only enabled resolutions)
    const resolutions: VideoResolution[] = [];
    for (const [name, config] of Object.entries(resolutionConfig)) {
      const resConfig = config as any;
      // Only include enabled resolutions that are <= source resolution
      if (resConfig.enabled && resConfig.height <= metadata.height) {
        resolutions.push({
          name,
          height: resConfig.height,
          videoBitrate: resConfig.videoBitrate,
          audioBitrate: resConfig.audioBitrate
        });
      }
    }

    // Sort by height ascending
    resolutions.sort((a, b) => a.height - b.height);

    if (resolutions.length === 0) {
      throw new Error('No video resolutions enabled in configuration or all resolutions exceed source video height');
    }

    for (const resolution of resolutions) {
      const resolutionDir = path.join(videoDir, resolution.name);
      const stage = resolution.name as '240p' | '360p' | '720p' | '1080p';
      
      if (onProgress) {
        onProgress({
          stage,
          progress: 0,
          message: `Encoding ${resolution.name}...`
        });
      }

      await generateHLS(rotatedPath, resolutionDir, resolution, (progress) => {
        if (onProgress) {
          onProgress({
            stage,
            progress,
            message: `Encoding ${resolution.name}...`
          });
        }
      });
    }

    // Step 3.5: Generate master playlist for adaptive streaming
    info('[VideoProcessor] Generating master HLS playlist');
    const masterPlaylistPath = path.join(videoDir, 'master.m3u8');
    let masterContent = '#EXTM3U\n#EXT-X-VERSION:3\n\n';
    
    for (const resolution of resolutions) {
      // Calculate total bandwidth (video + audio bitrate in bps)
      const videoBitrateKbps = parseInt(resolution.videoBitrate);
      const audioBitrateKbps = parseInt(resolution.audioBitrate);
      const totalBandwidth = (videoBitrateKbps + audioBitrateKbps) * 1000;
      
      // Calculate width based on 16:9 aspect ratio
      const width = Math.round(resolution.height * (16 / 9));
      
      masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=${totalBandwidth},RESOLUTION=${width}x${resolution.height}\n`;
      masterContent += `${resolution.name}/playlist.m3u8\n\n`;
    }
    
    await writeFile(masterPlaylistPath, masterContent, 'utf-8');
    info(`[VideoProcessor] Master playlist created with ${resolutions.length} quality levels`);

    // Step 4: Extract thumbnails
    if (onProgress) {
      onProgress({
        stage: 'thumbnail',
        progress: 0,
        message: 'Extracting thumbnail...'
      });
    }

    const thumbnailPath = path.join(optimizedDir, 'thumbnail', album, filename.replace(/\.[^.]+$/, '.jpg'));
    await extractThumbnail(rotatedPath, thumbnailPath, 512, (progress) => {
      if (onProgress) {
        onProgress({
          stage: 'thumbnail',
          progress,
          message: 'Extracting thumbnail...'
        });
      }
    });

    // Step 5: Extract modal-sized preview
    if (onProgress) {
      onProgress({
        stage: 'modal-preview',
        progress: 0,
        message: 'Extracting preview image...'
      });
    }

    const modalPath = path.join(optimizedDir, 'modal', album, filename.replace(/\.[^.]+$/, '.jpg'));
    await extractThumbnail(rotatedPath, modalPath, 2048, (progress) => {
      if (onProgress) {
        onProgress({
          stage: 'modal-preview',
          progress,
          message: 'Extracting preview image...'
        });
      }
    });

    // Clean up rotated file
    await unlink(rotatedPath);

    info(`[VideoProcessor] Video processing complete: ${album}/${filename}`);
  } catch (err) {
    error('[VideoProcessor] Video processing failed:', err);
    throw err;
  }
}

/**
 * Check if ffmpeg is available
 */
export async function checkFFmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });
    
    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}
