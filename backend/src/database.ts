/**
 * SQLite Database Module
 * Manages image metadata including AI-generated titles and descriptions
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file path (in project root)
const DB_PATH = path.join(__dirname, '..', '..', 'image-metadata.db');

let db: any = null;

/**
 * Initialize the database and create tables if they don't exist
 */
export function initializeDatabase(): any {
  if (db) {
    return db;
  }

  db = new Database(DB_PATH);
  
  // Performance optimizations
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
  db.pragma('synchronous = NORMAL'); // Faster writes, still safe
  db.pragma('cache_size = -64000'); // 64MB cache (negative = KB)
  db.pragma('temp_store = MEMORY'); // Store temp tables in memory
  db.pragma('mmap_size = 30000000000'); // 30GB memory-mapped I/O
  db.pragma('page_size = 4096'); // Optimize page size
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create image_metadata table
  db.exec(`
    CREATE TABLE IF NOT EXISTS image_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album TEXT NOT NULL,
      filename TEXT NOT NULL,
      title TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(album, filename)
    )
  `);
  
  // Create index for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_album_filename 
    ON image_metadata(album, filename)
  `);
  
  console.log('✓ SQLite database initialized at:', DB_PATH);
  console.log('✓ WAL mode enabled for better performance');
  
  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): any {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Save or update image metadata
 */
export function saveImageMetadata(
  album: string,
  filename: string,
  title: string | null,
  description: string | null
): void {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    INSERT INTO image_metadata (album, filename, title, description)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(album, filename) 
    DO UPDATE SET 
      title = excluded.title,
      description = excluded.description,
      updated_at = CURRENT_TIMESTAMP
  `);
  
  stmt.run(album, filename, title, description);
}

/**
 * Get image metadata by album and filename
 */
export function getImageMetadata(album: string, filename: string): {
  id: number;
  album: string;
  filename: string;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
} | undefined {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM image_metadata 
    WHERE album = ? AND filename = ?
  `);
  
  return stmt.get(album, filename) as any;
}

/**
 * Get all image metadata for an album
 */
export function getAlbumMetadata(album: string): Array<{
  id: number;
  album: string;
  filename: string;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}> {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM image_metadata 
    WHERE album = ?
    ORDER BY filename
  `);
  
  return stmt.all(album) as any[];
}

/**
 * Get all image metadata
 */
export function getAllMetadata(): Array<{
  id: number;
  album: string;
  filename: string;
  title: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}> {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    SELECT * FROM image_metadata 
    ORDER BY album, filename
  `);
  
  return stmt.all() as any[];
}

/**
 * Update image metadata
 */
export function updateImageMetadata(
  album: string,
  filename: string,
  title: string | null,
  description: string | null
): boolean {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    UPDATE image_metadata 
    SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE album = ? AND filename = ?
  `);
  
  const result = stmt.run(title, description, album, filename);
  return result.changes > 0;
}

/**
 * Delete image metadata
 */
export function deleteImageMetadata(album: string, filename: string): boolean {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    DELETE FROM image_metadata 
    WHERE album = ? AND filename = ?
  `);
  
  const result = stmt.run(album, filename);
  return result.changes > 0;
}

/**
 * Delete all image metadata for an album
 */
export function deleteAlbumMetadata(album: string): number {
  const db = getDatabase();
  
  const stmt = db.prepare(`
    DELETE FROM image_metadata 
    WHERE album = ?
  `);
  
  const result = stmt.run(album);
  return result.changes;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('✓ Database connection closed');
  }
}

