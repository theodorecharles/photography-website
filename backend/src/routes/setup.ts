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
import sharp from "sharp";
import { error, warn, info, debug, verbose } from '../utils/logger.js';

const router = Router();

// Configure multer for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only (including HEIC which will be converted to PNG)
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check if initial setup is complete
 */
router.get("/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const projectRoot = path.join(__dirname, "../../../");
    const dataDir = process.env.DATA_DIR || path.join(projectRoot, "data");
    const configPath = path.join(dataDir, "config.json");
    const dbPath = path.join(dataDir, "gallery.db");
    const photosDir = path.join(dataDir, "photos");
    const optimizedDir = path.join(dataDir, "optimized");

    const checks = {
      configExists: fs.existsSync(configPath),
      databaseExists: fs.existsSync(dbPath),
      photosDirExists: fs.existsSync(photosDir),
      optimizedDirExists: fs.existsSync(optimizedDir),
      hasPhotos: false,
      isConfigured: false,
    };

    // Check if photos directory has any albums
    if (checks.photosDirExists) {
      const entries = fs.readdirSync(photosDir, { withFileTypes: true });
      checks.hasPhotos = entries.some((entry) => entry.isDirectory());
    }

    // Check if config is properly configured (not just example values)
    if (checks.configExists) {
      try {
        const configContent = fs.readFileSync(configPath, "utf8");
        const config = JSON.parse(configContent);

        // Check if critical fields are configured (not example values)
        const hasValidAuth =
          config.environment?.auth?.sessionSecret &&
          config.environment.auth.sessionSecret !== "your-session-secret-here";
        const hasValidBranding =
          config.branding?.siteName && config.branding.siteName !== "Your Name";

        checks.isConfigured = hasValidAuth && hasValidBranding;
      } catch (err) {
        checks.isConfigured = false;
      }
    }

    const setupComplete =
      checks.configExists && checks.databaseExists && checks.isConfigured;

    res.json({
      setupComplete,
      checks,
    });
  } catch (err) {
    error("Setup status check failed:", err);
    res.status(500).json({
      error: "Failed to check setup status",
      setupComplete: false,
    });
  }
});

/**
 * Initialize configuration with user-provided values
 */
router.post(
  "/initialize",
  async (req: Request, res: Response): Promise<void> => {
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
        metaDescription,
        language,
      } = req.body;

      // Validate required fields
      if (!siteName || !authorizedEmail || !authMethod) {
        res.status(400).json({
          error: "Site name, email, and authentication method are required",
        });
        return;
      }

      // Auto-detect frontend and backend URLs from request
      const protocol =
        req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
      const hostHeader =
        req.headers["x-forwarded-host"] ||
        req.headers["host"] ||
        "localhost:3000";
      const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;

      // Determine backend and frontend URLs based on which domain the request came to
      let backendUrl;
      let frontendUrl;

      // Extract IP or hostname without port for IP address detection
      const hostWithoutPort = host.split(":")[0];
      const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostWithoutPort);

      if (host.includes("localhost")) {
        // Localhost development
        backendUrl = "http://localhost:3001";
        frontendUrl = "http://localhost:3000";
      } else if (isIpAddress) {
        // IP address - use same IP for both frontend and backend with different ports
        // Extract port from host if present, otherwise use defaults
        const port = host.includes(":") ? host.split(":")[1] : "3000";
        const frontendPort = port === "3001" ? "3000" : port;
        const backendPort = port === "3000" ? "3001" : port;
        
        frontendUrl = `${protocol}://${hostWithoutPort}:${frontendPort}`;
        backendUrl = `${protocol}://${hostWithoutPort}:${backendPort}`;
      } else if (host.startsWith("api.") || host.startsWith("api-")) {
        // Request came to api.example.com or api-dev.example.com
        // Backend URL is the current host, frontend is www.domain
        backendUrl = `${protocol}://${host}`;
        const domain = host.replace(/^api(-dev)?\./, "");
        frontendUrl = `${protocol}://www${
          host.includes("api-dev") ? "-dev" : ""
        }.${domain}`;
      } else if (host.startsWith("www.") || host.startsWith("www-")) {
        // Request came to www.example.com or www-dev.example.com
        // Frontend URL is the current host, backend is api.domain
        frontendUrl = `${protocol}://${host}`;
        const domain = host.replace(/^www(-dev)?\./, "");
        backendUrl = `${protocol}://api${
          host.includes("www-dev") ? "-dev" : ""
        }.${domain}`;
      } else {
        // Bare domain (example.com)
        frontendUrl = `${protocol}://www.${host}`;
        backendUrl = `${protocol}://api.${host}`;
      }

      // Extract frontend hostname for allowedHosts (without protocol)
      const frontendHost = new URL(frontendUrl).host;

      info(`[Setup] Auto-detected URLs:`);
      info(`  Request host: ${host}`);
      info(`  Frontend: ${frontendUrl}`);
      info(`  Backend: ${backendUrl}`);
      info(`  Allowed hosts: ${frontendHost}`);

      // Validate auth method specific fields
      if (authMethod === "password") {
        if (!adminName || !adminPassword) {
          res.status(400).json({
            error: "Name and password are required for password authentication",
          });
          return;
        }
        if (adminPassword.length < 8) {
          res.status(400).json({
            error: "Password must be at least 8 characters",
          });
          return;
        }
      } else if (authMethod === "google") {
        if (!googleClientId || !googleClientSecret) {
          res.status(400).json({
            error:
              "Google Client ID and Secret are required for Google authentication",
          });
          return;
        }
      }

      const projectRoot = path.join(__dirname, "../../../");
      const dataDir = process.env.DATA_DIR || path.join(projectRoot, "data");
      const configPath = path.join(dataDir, "config.json");
      const configDefaultsPath = path.join(
        projectRoot,
        "config/config.defaults.json"
      );

      // Create config directory if it doesn't exist
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Load defaults config as template
      let config;
      if (fs.existsSync(configDefaultsPath)) {
        const defaultsContent = fs.readFileSync(configDefaultsPath, "utf8");
        config = JSON.parse(defaultsContent);
        // Override URLs with auto-detected values
        config.environment.frontend.apiUrl = backendUrl;
        config.environment.backend.allowedOrigins = [frontendUrl];
        config.environment.security.allowedHosts = [frontendHost];
      } else {
        // Fallback: create minimal config structure
        config = {
          environment: {
            features: {
              useGridSettings: true
            },
            frontend: {
              port: 3000,
              apiUrl: backendUrl,
            },
            backend: {
              port: 3001,
              photosDir: "photos",
              allowedOrigins: [frontendUrl],
            },
            optimization: {
              concurrency: 4,
              images: {
                thumbnail: { quality: 60, maxDimension: 512 },
                modal: { quality: 90, maxDimension: 2048 },
                download: { quality: 100, maxDimension: 4096 },
              },
            },
            security: {
              allowedHosts: [frontendHost],
              rateLimitWindowMs: 1000,
              rateLimitMaxRequests: 30,
              redirectFrom: [],
              redirectTo: "",
            },
            logging: {
              level: "error",
            },
            auth: {
              google: {
                enabled: false,
                clientId: "",
                clientSecret: "",
              },
              sessionSecret: "",
              authorizedEmails: [],
            },
          },
          branding: {
            siteName: "",
            avatarPath: "/photos/avatar.png",
            primaryColor: "#4ade80",
            secondaryColor: "#22c55e",
            metaDescription: "",
            metaKeywords: "",
            faviconPath: "/favicon.ico",
            language: "en",
          },
          analytics: {
            scriptPath: "",
            openobserve: {
              enabled: false,
              endpoint: "",
              organization: "",
              stream: "website",
              username: "",
              password: "",
            },
          },
          externalLinks: [],
          openai: {
            apiKey: "",
          },
          ai: {
            autoGenerateTitlesOnUpload: false,
          },
        };
      }

      // Generate secure session secret
      const sessionSecret = crypto.randomBytes(32).toString("hex");

      // Update config with user-provided values
      config.branding.siteName = siteName;
      config.branding.primaryColor = primaryColor || "#4ade80";
      config.branding.secondaryColor = secondaryColor || "#22c55e";
      config.branding.metaDescription =
        metaDescription || `Photography portfolio by ${siteName}`;
      config.branding.metaKeywords = `photography, portfolio, ${siteName.toLowerCase()}`;
      config.branding.language = language || "en";

      config.environment.auth.sessionSecret = sessionSecret;
      config.environment.auth.authorizedEmails = [authorizedEmail];

      // Configure Google OAuth if using Google auth method
      if (authMethod === "google" && googleClientId && googleClientSecret) {
        config.environment.auth.google.enabled = true;
        config.environment.auth.google.clientId = googleClientId;
        config.environment.auth.google.clientSecret = googleClientSecret;
      } else {
        // Disable Google auth for password-based setup
        config.environment.auth.google.enabled = false;
      }

      // Save config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      info("Configuration saved to:", configPath);

      // Create necessary directories
      const photosDir = path.join(dataDir, "photos");
      const optimizedDir = path.join(dataDir, "optimized");

      info("Creating directories:");
      info("  Photos:", photosDir);
      info("  Optimized:", optimizedDir);

      if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
        info("  Created photos directory");
      }
      if (!fs.existsSync(optimizedDir)) {
        fs.mkdirSync(optimizedDir, { recursive: true });
        info("  Created optimized directory");
      }

      // Initialize the database to create gallery.db
      try {
        const { initializeDatabase } = await import("../database.js");
        const db = initializeDatabase();
        info("  Database initialized");

        // Create users table if it doesn't exist
        info("  📝 Creating users table...");
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

        info("  Users table created");
      } catch (err) {
        error("Failed to initialize database:", err);
        // Continue anyway - database will be created on first access
      }

      // Create the first admin user
      info("\n👤 Creating admin user...");
      try {
        const { createUser, getUserByEmail } = await import(
          "../database-users.js"
        );

        // Check if user already exists
        const existingUser = getUserByEmail(authorizedEmail);
        if (existingUser) {
          info("  ⚠️ User already exists, skipping user creation");
        } else {
          // Prepare auth methods array
          const authMethods =
            authMethod === "password" ? ["credentials"] : ["google"];

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
            role: "admin", // First user is always admin
          };

          if (authMethod === "password") {
            userData.password = adminPassword;
            userData.name = adminName;
          }

          const user = createUser(userData);
          info("  Admin user created:", user.email);
        }
      } catch (err) {
        error("  Failed to create admin user:", err);
        res.status(500).json({
          error: "Failed to create admin user",
          details: err instanceof Error ? err.message : "Unknown error",
        });
        return;
      }

      // Reload backend configuration
      info("\nReloading backend configuration...");
      try {
        const { reloadConfig } = await import("../config.js");
        const reloadResult = reloadConfig();
        if (reloadResult.success) {
          info("  Configuration reloaded successfully");
        }
      } catch (err) {
        error("  Failed to reload configuration:", err);
      }

      // Initialize Google OAuth strategy with new config
      info("\n🔐 Initializing Google OAuth...");
      try {
        const { initializeGoogleStrategy } = await import("./auth.js");
        const oauthInitialized = initializeGoogleStrategy();
        if (oauthInitialized) {
          info("  Google OAuth strategy initialized from setup");
        } else {
          info("  ⚠️ Google OAuth initialization returned false");
        }
      } catch (err) {
        error("  Failed to initialize Google OAuth:", err);
      }

      // Only restart if Google OAuth is selected (needs OAuth strategy initialization)
      // Password auth doesn't need restart - config reloaded dynamically
      const requiresRestart = authMethod === "google";

      res.json({
        success: true,
        message: "Configuration initialized successfully",
        requiresRestart,
      });

      if (requiresRestart) {
        // Gracefully restart the backend after sending response
        // This ensures Google OAuth strategy is properly initialized
        info(
          "\nTriggering backend restart to initialize Google OAuth..."
        );
        setTimeout(() => {
          info("Setup complete - exiting for restart");
          process.exit(0); // Exit cleanly - PM2/Docker will restart the process
        }, 500); // Wait 500ms to ensure response is sent, then restart immediately
      } else {
        info("\nSetup complete - no restart needed for password auth");
      }
    } catch (err) {
      error("Setup initialization failed:", err);
      res.status(500).json({
        error: "Failed to initialize configuration",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
);

/**
 * Upload avatar during setup
 */
router.post(
  "/upload-avatar",
  upload.single("avatar"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const projectRoot = path.join(__dirname, "../../../");
      const dataDir = process.env.DATA_DIR || path.join(projectRoot, "data");
      const photosDir = path.join(dataDir, "photos");
      const frontendPublicDir = path.join(projectRoot, 'frontend', 'public');

      // Create directories if they don't exist
      if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
      }
      if (!fs.existsSync(frontendPublicDir)) {
        fs.mkdirSync(frontendPublicDir, { recursive: true });
      }

      // Always save as PNG
      const avatarPath = path.join(photosDir, "avatar.png");
      const faviconPngPath = path.join(frontendPublicDir, 'favicon.png');
      const faviconIcoPath = path.join(frontendPublicDir, 'favicon.ico');

      // Also define dist path for immediate serving
      const frontendDistDir = path.join(projectRoot, 'frontend', 'dist');
      const faviconIcoPathDist = path.join(frontendDistDir, 'favicon.ico');

      // Use Sharp to convert any image format (including HEIC) to PNG and generate favicons
      try {
        // Process and save avatar.png with auto-rotation based on EXIF
        await sharp(file.buffer)
          .rotate() // Auto-rotate based on EXIF orientation
          .resize(512, 512, { fit: 'cover' })
          .png()
          .toFile(avatarPath);

        // Update icon files so they stay in sync with avatar
        const icon192Path = path.join(frontendPublicDir, 'icon-192.png');
        const icon512Path = path.join(frontendPublicDir, 'icon-512.png');
        const appleTouchIconPath = path.join(frontendPublicDir, 'apple-touch-icon.png');

        // Generate icon-192.png (192x192)
        await sharp(file.buffer)
          .rotate()
          .resize(192, 192, { fit: 'cover' })
          .png()
          .toFile(icon192Path);

        // Generate icon-512.png (512x512)
        await sharp(file.buffer)
          .rotate()
          .resize(512, 512, { fit: 'cover' })
          .png()
          .toFile(icon512Path);

        // Generate apple-touch-icon.png (192x192)
        await sharp(file.buffer)
          .rotate()
          .resize(192, 192, { fit: 'cover' })
          .png()
          .toFile(appleTouchIconPath);

        // Create favicon.png (same as avatar)
        await sharp(file.buffer)
          .rotate() // Auto-rotate based on EXIF orientation
          .resize(512, 512, { fit: 'cover' })
          .png()
          .toFile(faviconPngPath);

        // Generate favicon.ico (32x32) using Sharp
        await sharp(file.buffer)
          .rotate() // Auto-rotate based on EXIF orientation
          .resize(32, 32, { fit: 'cover' })
          .toFormat('png')
          .toFile(faviconIcoPath);

        info('[Setup] Generated avatar.png, icon files, and favicons');

        // Also copy to dist directory so it's immediately served
        if (fs.existsSync(frontendDistDir)) {
          fs.copyFileSync(faviconIcoPath, faviconIcoPathDist);
          info('[Setup] Copied favicon.ico to dist directory');
        }
      } catch (err) {
        error("Failed to process avatar image:", err);
        res.status(500).json({ error: "Failed to process avatar image" });
        return;
      }

      // Update config.json with avatar and favicon paths
      const configPath = path.join(dataDir, "config.json");
      if (fs.existsSync(configPath)) {
        try {
          const configContent = fs.readFileSync(configPath, "utf8");
          const config = JSON.parse(configContent);
          if (!config.branding) {
            config.branding = {};
          }
          config.branding.avatarPath = "/photos/avatar.png";
          config.branding.faviconPath = "/favicon.ico";
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
          info('[Setup] Updated config with avatar and favicon paths');
        } catch (err) {
          error("Failed to update config with avatar path:", err);
        }
      }

      res.json({
        success: true,
        avatarPath: "/photos/avatar.png",
      });
    } catch (err) {
      error("Avatar upload failed:", err);
      res.status(500).json({
        error: "Failed to upload avatar",
        details: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
);

export default router;
