/**
 * Setup Routes
 * Handles initial setup and configuration for first-time users
 */

import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import multer from "multer";

const router = Router();

// Configure multer for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if initial setup is complete
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectRoot = path.join(__dirname, '../../../');
    const dataDir = process.env.DATA_DIR || path.join(projectRoot, 'data');
    const configPath = path.join(dataDir, 'config.json');
    const dbPath = path.join(dataDir, 'gallery.db');
    const photosDir = path.join(dataDir, 'photos');
    const optimizedDir = path.join(dataDir, 'optimized');

    const checks = {
      configExists: fs.existsSync(configPath),
      databaseExists: fs.existsSync(dbPath),
      photosDirExists: fs.existsSync(photosDir),
      optimizedDirExists: fs.existsSync(optimizedDir),
      hasPhotos: false,
      isConfigured: false
    };

    // Check if photos directory has any albums
    if (checks.photosDirExists) {
      const entries = fs.readdirSync(photosDir, { withFileTypes: true });
      checks.hasPhotos = entries.some(entry => entry.isDirectory());
    }

    // Check if config is properly configured (not just example values)
    if (checks.configExists) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // Check if critical fields are configured (not example values)
        const hasValidAuth = config.environment?.auth?.sessionSecret && 
                            config.environment.auth.sessionSecret !== 'your-session-secret-here';
        const hasValidBranding = config.branding?.siteName && 
                                config.branding.siteName !== 'Your Name';
        
        checks.isConfigured = hasValidAuth && hasValidBranding;
      } catch (err) {
        checks.isConfigured = false;
      }
    }

    const setupComplete = checks.configExists && 
                         checks.databaseExists && 
                         checks.isConfigured;

    res.json({
      setupComplete,
      checks
    });
  } catch (error) {
    console.error('Setup status check failed:', error);
    res.status(500).json({ 
      error: 'Failed to check setup status',
      setupComplete: false 
    });
  }
});

/**
 * Initialize configuration with user-provided values
 */
router.post('/initialize', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      siteName,
      authorizedEmail,
      authMethod,
      adminName,
      adminPassword,
      googleClientId,
      googleClientSecret,
      primaryColor,
      secondaryColor,
      metaDescription
    } = req.body;

    // Validate required fields
    if (!siteName || !authorizedEmail || !authMethod) {
      res.status(400).json({ 
        error: 'Site name, email, and authentication method are required' 
      });
      return;
    }

    // Validate auth method specific fields
    if (authMethod === 'password') {
      if (!adminName || !adminPassword) {
        res.status(400).json({ 
          error: 'Name and password are required for password authentication' 
        });
        return;
      }
      if (adminPassword.length < 8) {
        res.status(400).json({ 
          error: 'Password must be at least 8 characters' 
        });
        return;
      }
    } else if (authMethod === 'google') {
      if (!googleClientId || !googleClientSecret) {
        res.status(400).json({ 
          error: 'Google Client ID and Secret are required for Google authentication' 
        });
        return;
      }
    }

    const projectRoot = path.join(__dirname, '../../../');
    const dataDir = process.env.DATA_DIR || path.join(projectRoot, 'data');
    const configPath = path.join(dataDir, 'config.json');
    const configExamplePath = path.join(projectRoot, 'config/config.example.json');

    // Create config directory if it doesn't exist
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Load example config as template
    let config;
    if (fs.existsSync(configExamplePath)) {
      const exampleContent = fs.readFileSync(configExamplePath, 'utf8');
      config = JSON.parse(exampleContent);
    } else {
      // Fallback: create minimal config structure
      config = {
        environment: {
          frontend: {
            port: 3000,
            apiUrl: "http://localhost:3001"
          },
          backend: {
            port: 3001,
            photosDir: "photos",
            allowedOrigins: ["http://localhost:3000"]
          },
          optimization: {
            concurrency: 4,
            images: {
              thumbnail: { quality: 60, maxDimension: 512 },
              modal: { quality: 90, maxDimension: 2048 },
              download: { quality: 100, maxDimension: 4096 }
            }
          },
          security: {
            allowedHosts: ["localhost:3000"],
            rateLimitWindowMs: 1000,
            rateLimitMaxRequests: 30,
            redirectFrom: [],
            redirectTo: ""
          },
          auth: {
            google: {
              clientId: "",
              clientSecret: ""
            },
            sessionSecret: "",
            authorizedEmails: []
          }
        },
        branding: {
          siteName: "",
          avatarPath: "/photos/avatar.png",
          primaryColor: "#4ade80",
          secondaryColor: "#22c55e",
          metaDescription: "",
          metaKeywords: "",
          faviconPath: "/favicon.ico"
        },
        analytics: {
          scriptPath: "",
          openobserve: {
            enabled: false,
            endpoint: "",
            organization: "",
            stream: "website",
            username: "",
            password: ""
          },
          hmacSecret: ""
        },
        notifications: {
          telegram: {
            enabled: false,
            botToken: "",
            chatId: ""
          }
        },
        externalLinks: [],
        openai: {
          apiKey: ""
        },
        ai: {
          autoGenerateTitlesOnUpload: false
        }
      };
    }

    // Generate secure session secret
    const sessionSecret = crypto.randomBytes(32).toString('hex');

    // Update config with user-provided values
    config.branding.siteName = siteName;
    config.branding.primaryColor = primaryColor || '#4ade80';
    config.branding.secondaryColor = secondaryColor || '#22c55e';
    config.branding.metaDescription = metaDescription || `Photography portfolio by ${siteName}`;
    config.branding.metaKeywords = `photography, portfolio, ${siteName.toLowerCase()}`;
    
    config.environment.auth.sessionSecret = sessionSecret;
    config.environment.auth.authorizedEmails = [authorizedEmail];
    
    // Configure Google OAuth if using Google auth method
    if (authMethod === 'google' && googleClientId && googleClientSecret) {
      config.environment.auth.google.clientId = googleClientId;
      config.environment.auth.google.clientSecret = googleClientSecret;
    }

    // Save config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    // Create necessary directories
    const photosDir = path.join(dataDir, 'photos');
    const optimizedDir = path.join(dataDir, 'optimized');

    console.log('Creating directories:');
    console.log('  Photos:', photosDir);
    console.log('  Optimized:', optimizedDir);

    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true });
      console.log('  ✓ Created photos directory');
    }
    if (!fs.existsSync(optimizedDir)) {
      fs.mkdirSync(optimizedDir, { recursive: true });
      console.log('  ✓ Created optimized directory');
    }

    // Initialize the database to create gallery.db
    try {
      const { initializeDatabase } = await import('../database.js');
      const db = initializeDatabase();
      console.log('  ✓ Database initialized');
      
      // Create users table if it doesn't exist
      console.log('  📝 Creating users table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT,
          auth_methods TEXT NOT NULL DEFAULT '["google"]',
          mfa_enabled INTEGER NOT NULL DEFAULT 0,
          totp_secret TEXT,
          backup_codes TEXT,
          passkeys TEXT,
          google_id TEXT UNIQUE,
          name TEXT,
          picture TEXT,
          role TEXT NOT NULL DEFAULT 'viewer',
          is_active INTEGER NOT NULL DEFAULT 1,
          email_verified INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'active',
          invite_token TEXT UNIQUE,
          invite_expires_at TEXT,
          password_reset_token TEXT UNIQUE,
          password_reset_expires_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_login_at TEXT
        )
      `);
      
      // Create indexes for users table
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
      `);
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)
      `);
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_invite_token ON users(invite_token)
      `);
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token)
      `);
      
      console.log('  ✓ Users table created');
    } catch (err) {
      console.error('Failed to initialize database:', err);
      // Continue anyway - database will be created on first access
    }

    // Create the first admin user
    console.log('\n👤 Creating admin user...');
    try {
      const { createUser, getUserByEmail } = await import('../database-users.js');
      
      // Check if user already exists
      const existingUser = getUserByEmail(authorizedEmail);
      if (existingUser) {
        console.log('  ⚠️ User already exists, skipping user creation');
      } else {
        // Prepare auth methods array
        const authMethods = authMethod === 'password' ? ['credentials'] : ['google'];
        
        // Create the user
        const userData: {
          email: string;
          password?: string;
          auth_methods: string[];
          name?: string;
          email_verified: boolean;
          role: string;
        } = {
          email: authorizedEmail,
          auth_methods: authMethods,
          email_verified: true, // First user is auto-verified
          role: 'admin', // First user is always admin
        };
        
        if (authMethod === 'password') {
          userData.password = adminPassword;
          userData.name = adminName;
        }
        
        const user = createUser(userData);
        console.log('  ✓ Admin user created:', user.email);
      }
    } catch (err) {
      console.error('  ❌ Failed to create admin user:', err);
      res.status(500).json({ 
        error: 'Failed to create admin user',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
      return;
    }

    // Reload backend configuration
    console.log('\n🔄 Reloading backend configuration...');
    try {
      const { reloadConfig } = await import('../config.js');
      const reloadResult = reloadConfig();
      if (reloadResult.success) {
        console.log('  ✓ Configuration reloaded successfully');
      }
    } catch (err) {
      console.error('  ❌ Failed to reload configuration:', err);
    }

    // Initialize Google OAuth strategy with new config
    console.log('\n🔐 Initializing Google OAuth...');
    try {
      const { initializeGoogleStrategy } = await import('./auth.js');
      const oauthInitialized = initializeGoogleStrategy();
      if (oauthInitialized) {
        console.log('  ✓ Google OAuth strategy initialized from setup');
      } else {
        console.log('  ⚠️ Google OAuth initialization returned false');
      }
    } catch (err) {
      console.error('  ❌ Failed to initialize Google OAuth:', err);
    }

    res.json({
      success: true,
      message: 'Configuration initialized successfully',
      requiresRestart: false // No restart needed - config and OAuth reloaded dynamically
    });
  } catch (error) {
    console.error('Setup initialization failed:', error);
    res.status(500).json({ 
      error: 'Failed to initialize configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Upload avatar during setup
 */
router.post('/upload-avatar', upload.single('avatar'), async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    
    const projectRoot = path.join(__dirname, '../../../');
    const dataDir = process.env.DATA_DIR || path.join(projectRoot, 'data');
    const photosDir = path.join(dataDir, 'photos');
    
    // Create photos directory if it doesn't exist
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir, { recursive: true });
    }
    
    // Determine file extension from mimetype
    const ext = file.mimetype.split('/')[1] || 'png';
    const avatarPath = path.join(photosDir, `avatar.${ext}`);
    
    // Save the file
    fs.writeFileSync(avatarPath, file.buffer);
    
    // Update config.json with avatar path
    const configPath = path.join(dataDir, 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        config.branding.avatarPath = `/photos/avatar.${ext}`;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      } catch (err) {
        console.error('Failed to update config with avatar path:', err);
      }
    }
    
    res.json({ 
      success: true,
      avatarPath: `/photos/avatar.${ext}`
    });
  } catch (error) {
    console.error('Avatar upload failed:', error);
    res.status(500).json({ 
      error: 'Failed to upload avatar',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

