#!/usr/bin/env node

/**
 * Database Migration: Add user invitation and password reset fields
 * 
 * Adds columns for:
 * - invite_token: Secure token for invite links
 * - invite_expires_at: Timestamp when invite expires
 * - status: User status (invited, active, invite_expired)
 * - password_reset_token: Token for password reset links
 * - password_reset_expires_at: Timestamp when password reset expires
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Import Database from better-sqlite3
const Database = require('better-sqlite3');

// Determine DATA_DIR (same logic as config.ts)
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
let DB_PATH = join(DATA_DIR, 'gallery.db');

// Check if database exists at DATA_DIR path
if (!fs.existsSync(DB_PATH)) {
  // Try fallback to project root (development mode)
  DB_PATH = join(__dirname, 'gallery.db');
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database not found. Please run the application first to initialize the database.');
    process.exit(1);
  }
}

console.log('🔄 Running migration: Add user invitation and password reset fields');
console.log(`📁 Database path: ${DB_PATH}`);

const db = new Database(DB_PATH);

// Enable foreign keys and set pragmas
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const columnNames = tableInfo.map((col) => col.name);
  
  const hasInviteToken = columnNames.includes('invite_token');
  const hasStatus = columnNames.includes('status');
  const hasPasswordResetToken = columnNames.includes('password_reset_token');
  
  if (hasInviteToken && hasStatus && hasPasswordResetToken) {
    console.log('✅ Migration already applied - columns exist');
    process.exit(0);
  }
  
  console.log('📝 Applying migration...');
  
  // Add invite_token column if it doesn't exist
  if (!hasInviteToken) {
    db.prepare('ALTER TABLE users ADD COLUMN invite_token TEXT').run();
    console.log('  ✓ Added invite_token column');
  }
  
  // Add invite_expires_at column if it doesn't exist
  if (!columnNames.includes('invite_expires_at')) {
    db.prepare('ALTER TABLE users ADD COLUMN invite_expires_at TEXT').run();
    console.log('  ✓ Added invite_expires_at column');
  }
  
  // Add status column if it doesn't exist
  if (!hasStatus) {
    db.prepare("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'").run();
    console.log('  ✓ Added status column');
    
    // Set all existing users to 'active' status
    const updateResult = db.prepare("UPDATE users SET status = 'active' WHERE status IS NULL").run();
    console.log(`  ✓ Updated ${updateResult.changes} existing users to 'active' status`);
  }
  
  // Add password_reset_token column if it doesn't exist
  if (!hasPasswordResetToken) {
    db.prepare('ALTER TABLE users ADD COLUMN password_reset_token TEXT').run();
    console.log('  ✓ Added password_reset_token column');
  }
  
  // Add password_reset_expires_at column if it doesn't exist
  if (!columnNames.includes('password_reset_expires_at')) {
    db.prepare('ALTER TABLE users ADD COLUMN password_reset_expires_at TEXT').run();
    console.log('  ✓ Added password_reset_expires_at column');
  }
  
  // Create index on invite_token for faster lookups
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token)').run();
    console.log('  ✓ Created index on invite_token');
  } catch (err) {
    // Index might already exist, that's fine
    console.log('  ℹ️  Index on invite_token already exists');
  }
  
  // Create index on password_reset_token for faster lookups
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token)').run();
    console.log('  ✓ Created index on password_reset_token');
  } catch (err) {
    // Index might already exist, that's fine
    console.log('  ℹ️  Index on password_reset_token already exists');
  }
  
  console.log('✅ Migration completed successfully');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}

