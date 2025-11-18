/**
 * Configuration Management Routes
 * Provides endpoints for reading and updating configuration
 */

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { csrfProtection } from "../security.js";
import { requireAuth, requireAdmin } from "../auth/middleware.js";
import { error, warn, info, debug, verbose } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

import { DATA_DIR, reloadConfig } from "../config.js";
import { sendTestEmail } from "../email.js";

const CONFIG_PATH = path.join(DATA_DIR, "config.json");

/**
 * GET /api/config/runtime
 * Get runtime configuration for frontend (public endpoint for OOBE support)
 * Returns API URL auto-detected from request headers when config doesn't exist
 */
router.get("/runtime", (req, res) => {
  try {
    // Check if config exists
    const configExists = fs.existsSync(CONFIG_PATH);
    
    if (configExists) {
      // Return API URL from config
      const configData = fs.readFileSync(CONFIG_PATH, "utf8");
      const config = JSON.parse(configData);
      res.json({
        apiUrl: config.environment.frontend.apiUrl,
        configExists: true
      });
    } else {
      // OOBE mode - auto-detect API URL from request
      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const hostHeader = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:3000';
      const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
      
      // Determine API URL based on convention
      let apiUrl;
      if (host.includes('localhost')) {
        apiUrl = 'http://localhost:3001';
      } else if (host.startsWith('www.')) {
        // www.example.com -> api.example.com
        apiUrl = `${protocol}://api.${host.substring(4)}`;
      } else {
        // example.com -> api.example.com
        apiUrl = `${protocol}://api.${host}`;
      }
      
      res.json({
        apiUrl,
        configExists: false
      });
    }
  } catch (err) {
    error("Error reading runtime config:", err);
    res.status(500).json({ error: "Failed to read runtime configuration" });
  }
});

// Apply CSRF protection to all other routes
router.use(csrfProtection);

/**
 * GET /api/config
 * Get current configuration (excluding sensitive fields)
 */
router.get("/", requireAuth, (req, res) => {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, "utf8");
    const config = JSON.parse(configData);

    // Return full config for admin to edit
    // (sensitive fields will be masked on frontend if needed)
    res.json(config);
  } catch (err) {
    error("Error reading config:", err);
    res.status(500).json({ error: "Failed to read configuration" });
  }
});

/**
 * POST /api/config/validate-openai-key
 * Validate OpenAI API key
 */
router.post(
  "/validate-openai-key",
  requireAdmin,
  express.json(),
  async (req, res) => {
    try {
      const { apiKey } = req.body;

      if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
        res.json({ valid: true }); // Empty key is considered valid (for removal)
        return;
      }

      info("[OpenAI Validation] Testing API key...");

      // Test the API key by calling OpenAI's models endpoint
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      info("[OpenAI Validation] Response status:", response.status);
      info("[OpenAI Validation] Response ok:", response.ok);

      // If not ok, log the error details
      if (!response.ok) {
        const errorText = await response.text();
        error("[OpenAI Validation] Error response:", errorText);
      }

      res.json({ valid: response.ok });
    } catch (err) {
      error("[OpenAI Validation] Exception:", err);
      res.json({ valid: false });
    }
  }
);

/**
 * PUT /api/config
 * Update configuration
 */
router.put("/", requireAdmin, express.json(), (req, res) => {
  try {
    const newConfig = req.body;

    // Validate that we have a valid config object
    if (!newConfig || typeof newConfig !== "object") {
      res.status(400).json({ error: "Invalid configuration data" });
      return;
    }

    // Read current config to preserve structure
    const currentConfigData = fs.readFileSync(CONFIG_PATH, "utf8");
    const currentConfig = JSON.parse(currentConfigData);

    // Merge new config with current (preserving any fields not sent)
    const updatedConfig = {
      ...currentConfig,
      ...newConfig,
    };

    // Write updated config back to file
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify(updatedConfig, null, 2),
      "utf8"
    );

    // Reload configuration cache so changes take effect immediately
    reloadConfig();

    info("Configuration updated by:", req.user);

    res.json({
      success: true,
      message: "Configuration updated successfully",
    });
  } catch (err) {
    error("Error updating config:", err);
    res.status(500).json({ error: "Failed to update configuration" });
  }
});

/**
 * POST /api/config/test-email
 * Send a test email to verify SMTP configuration
 */
router.post(
  "/test-email",
  requireAdmin,
  express.json(),
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string" || !email.includes("@")) {
        res.status(400).json({ error: "Valid email address is required" });
        return;
      }

      info(`[Test Email] Sending test email to ${email}...`);

      const success = await sendTestEmail(email);

      if (success) {
        res.json({
          success: true,
          message: `Test email sent successfully to ${email}`,
        });
      } else {
        res.status(500).json({
          error: "Failed to send test email. Please check your SMTP configuration.",
        });
      }
    } catch (err) {
      error("[Test Email] Error:", err);
      res.status(500).json({ error: "Failed to send test email" });
    }
  }
);

export default router;
