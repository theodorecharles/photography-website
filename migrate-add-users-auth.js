/**
 * Migration: Add users table and multi-auth support
 * Adds support for username/password, MFA, and passkeys alongside Google OAuth
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Import Database from better-sqlite3
const Database = require('better-sqlite3');
import fs from 'fs';

// Determine DATA_DIR (same logic as config.ts)
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
let DB_PATH = join(DATA_DIR, 'gallery.db');
let CONFIG_PATH = join(DATA_DIR, 'config.json');

// Check if database exists at DATA_DIR path
if (!fs.existsSync(DB_PATH)) {
  // Try fallback to project root (development mode)
  DB_PATH = join(__dirname, 'gallery.db');
  CONFIG_PATH = join(__dirname, 'config/config.json');
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database not found. Please run the application first to initialize the database.');
    process.exit(1);
  }
}

console.log('🔄 Starting users table migration...');
console.log(`📂 Database: ${DB_PATH}`);

const db = new Database(DB_PATH);

// Enable WAL mode and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

try {
  // Check if users table already exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='users'
  `).get();

  if (tableExists) {
    console.log('✓ Users table already exists, skipping creation');
  } else {
    console.log('📝 Creating users table...');
    
    // Create users table
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        username TEXT UNIQUE,
        password_hash TEXT,
        
        -- Auth methods enabled for this user (JSON array)
        auth_methods TEXT NOT NULL DEFAULT '["google"]',
        
        -- MFA settings
        mfa_enabled BOOLEAN DEFAULT 0,
        totp_secret TEXT,
        backup_codes TEXT,  -- JSON array of hashed backup codes
        
        -- Passkeys (WebAuthn) - JSON array of passkey objects
        passkeys TEXT,
        
        -- OAuth provider IDs
        google_id TEXT UNIQUE,
        
        -- Profile information
        name TEXT,
        picture TEXT,
        role TEXT DEFAULT 'admin',
        
        -- Account status
        is_active BOOLEAN DEFAULT 1,
        email_verified BOOLEAN DEFAULT 0,
        
        -- Timestamps
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME
      )
    `);
    
    console.log('✓ Users table created');
  }

  // Check if sessions table already exists
  const sessionsTableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='auth_sessions'
  `).get();

  if (sessionsTableExists) {
    console.log('✓ Auth sessions table already exists, skipping creation');
  } else {
    console.log('📝 Creating auth_sessions table...');
    
    // Create sessions table for better session tracking
    db.exec(`
      CREATE TABLE auth_sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at DATETIME NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        mfa_verified BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create index for session cleanup
    db.exec(`
      CREATE INDEX idx_auth_sessions_expires 
      ON auth_sessions(expires_at)
    `);
    
    console.log('✓ Auth sessions table created');
  }

  // Check if mfa_attempts table already exists
  const mfaAttemptsTableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='mfa_attempts'
  `).get();

  if (mfaAttemptsTableExists) {
    console.log('✓ MFA attempts table already exists, skipping creation');
  } else {
    console.log('📝 Creating mfa_attempts table...');
    
    // Create MFA attempts table for rate limiting
    db.exec(`
      CREATE TABLE mfa_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ip_address TEXT NOT NULL,
        success BOOLEAN NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create index for rate limiting queries
    db.exec(`
      CREATE INDEX idx_mfa_attempts_user_time 
      ON mfa_attempts(user_id, created_at)
    `);
    
    console.log('✓ MFA attempts table created');
  }

  // Migrate existing authorized emails to users table
  if (fs.existsSync(CONFIG_PATH)) {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(configContent);
    const authorizedEmails = config.environment?.auth?.authorizedEmails || [];

    if (authorizedEmails.length > 0) {
      console.log(`📧 Found ${authorizedEmails.length} authorized email(s) in config`);
      
      for (const email of authorizedEmails) {
        // Check if user already exists
        const existingUser = db.prepare(`
          SELECT id FROM users WHERE email = ?
        `).get(email);

        if (existingUser) {
          console.log(`  ✓ User already exists: ${email}`);
        } else {
          // Create user with Google auth only
          db.prepare(`
            INSERT INTO users (email, auth_methods, email_verified)
            VALUES (?, '["google"]', 1)
          `).run(email);
          
          console.log(`  ✓ Migrated user: ${email}`);
        }
      }
    } else {
      console.log('⚠️  No authorized emails found in config.json');
      console.log('   You will need to create users manually or via the setup wizard');
    }
  }

  console.log('');
  console.log('✅ Migration completed successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Install Auth.js dependencies');
  console.log('  2. Configure Auth.js in backend');
  console.log('  3. Update frontend login UI');
  console.log('');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
