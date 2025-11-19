#!/usr/bin/env node

/**
 * Generate AI Titles Script
 * Scans all images in the optimized/thumbnail directory and generates titles for them
 */

import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pLimit from "p-limit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load config
const CONFIG_PATH = path.join(__dirname, "../data/config.json");

// Database setup
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const DB_PATH = path.join(__dirname, "../data/gallery.db");

let processedCount = 0;
let skippedCount = 0;
let errorCount = 0;

// Check if we're running in a TTY or piped/SSE
const isTTY = process.stdout.isTTY;

function initDatabase() {
  const db = new Database(DB_PATH);

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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_album_filename 
    ON image_metadata(album, filename)
  `);

  return db;
}

async function generateImageTitle(
  openai,
  thumbnailPath,
  album,
  filename,
  db,
  languageName,
  retryCount = 0
) {
  try {
    // Read the thumbnail image and convert to base64
    const imageBuffer = fs.readFileSync(thumbnailPath);
    const base64Image = imageBuffer.toString("base64");
    const mimeType = thumbnailPath.endsWith(".png")
      ? "image/png"
      : "image/jpeg";

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Generate a short, descriptive title for this photograph in ${languageName} (maximum 8 words). Be specific and descriptive, capturing the key subject and mood. Return only the title in ${languageName}, no quotes or extra text.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "low",
              },
            },
          ],
        },
      ],
      max_tokens: 50,
    });

    let title = response.choices[0]?.message?.content?.trim();

    if (!title) {
      console.error(`  ✗ Failed to generate title (empty response)`);
      errorCount++;
      return null;
    }

    // Remove surrounding quotes if present
    title = title.replace(/^["']|["']$/g, "");
    title = title.trim(); // Trim again after removing quotes

    // Save to database
    const stmt = db.prepare(`
      INSERT INTO image_metadata (album, filename, title, description)
      VALUES (?, ?, ?, NULL)
      ON CONFLICT(album, filename) 
      DO UPDATE SET 
        title = excluded.title,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(album, filename, title);

    if (isTTY) {
      console.log(`  ✓ "${title}"`);
    }
    processedCount++;

    return title;
  } catch (error) {
    // Handle rate limiting with exponential backoff
    if (error.status === 429 && retryCount < 5) {
      const retryAfter = error.headers?.["retry-after"];
      let waitTime = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s, 8s, 16s

      // Double the wait time to be extra safe
      waitTime = waitTime * 2;

      const waitSeconds = Math.ceil(waitTime / 1000);

      // Countdown with output for each second
      for (let i = waitSeconds; i > 0; i--) {
        console.log(`WAITING:${i}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return generateImageTitle(
        openai,
        thumbnailPath,
        album,
        filename,
        db,
        languageName,
        retryCount + 1
      );
    }

    console.error(`  ✗ Error:`, error.message);
    errorCount++;
    return null;
  }
}

async function scanAndGenerateTitles() {
  // Parse command line arguments
  const forceRegenerate = process.argv.includes("--force");

  // Read config to get OpenAI API key and language
  const configData = fs.readFileSync(CONFIG_PATH, "utf8");
  const config = JSON.parse(configData);

  const apiKey = config.openai?.apiKey;
  const language = config.branding?.language || "en";

  if (!apiKey || apiKey.trim() === "") {
    console.error("ERROR: OpenAI API key not configured in config.json");
    process.exit(1);
  }

  // Language name mapping for prompts
  const languageNames = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    ja: "Japanese",
    nl: "Dutch",
    it: "Italian",
    pt: "Portuguese",
    ru: "Russian",
    "zh-CN": "Chinese (Simplified)",
    ko: "Korean",
    pl: "Polish",
    tr: "Turkish",
    sv: "Swedish",
    no: "Norwegian",
  };

  const languageName = languageNames[language] || "English";
  console.log(`Language: ${languageName} (${language})`);

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey });

  // Initialize database
  const db = initDatabase();
  console.log("✓ Database initialized");

  // Load all existing titles into memory (one query instead of thousands)
  let existingTitles = new Set();
  if (!forceRegenerate) {
    console.log("Loading existing titles from database...");
    const existingRows = db
      .prepare(
        "SELECT album, filename FROM image_metadata WHERE title IS NOT NULL"
      )
      .all();
    existingTitles = new Set(
      existingRows.map((row) => `${row.album}:${row.filename}`)
    );
    console.log(`✓ Found ${existingTitles.size} existing titles`);
  } else {
    console.log(
      "⚠️  FORCE REGENERATE MODE: Will overwrite all existing titles"
    );
  }

  // Scan optimized/thumbnail directory
  const thumbnailDir = path.join(__dirname, "../data/optimized/thumbnail");

  if (!fs.existsSync(thumbnailDir)) {
    console.error("ERROR: Thumbnail directory not found:", thumbnailDir);
    process.exit(1);
  }

  // Get all album directories
  const albums = fs
    .readdirSync(thumbnailDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  console.log(`Found ${albums.length} albums`);
  console.log("Scanning for images that need titles...\n");

  // First pass: identify all images that need titles
  const imagesToProcess = [];

  for (const album of albums) {
    const albumPath = path.join(thumbnailDir, album);
    const images = fs
      .readdirSync(albumPath)
      .filter((file) => /\.(jpg|jpeg|png)$/i.test(file));

    for (const filename of images) {
      const key = `${album}:${filename}`;
      if (existingTitles.has(key)) {
        skippedCount++;
      } else {
        const thumbnailPath = path.join(albumPath, filename);
        imagesToProcess.push({ album, filename, thumbnailPath });
      }
    }
  }

  if (forceRegenerate) {
    console.log(`✓ Found ${imagesToProcess.length} images to regenerate`);
  } else {
    console.log(
      `✓ Found ${imagesToProcess.length} images that need titles (skipping ${skippedCount} with existing titles)`
    );
  }

  if (imagesToProcess.length === 0) {
    console.log("\nNo images to process!");
    db.close();
    return;
  }

  console.log("\nStarting AI title generation...\n");

  // Concurrent processing with rate limiting
  // OpenAI Tier 1: 500 RPM (requests per minute)
  // Target 400 RPM to be safe = 6.67 requests/second
  // With 2 concurrent and 300ms delay = 6.67 req/sec = 400 RPM
  const concurrency = 2;
  const limit = pLimit(concurrency);

  // Add delay between requests to respect rate limits
  const delayBetweenRequests = 300; // 300ms delay = safe rate

  let completed = 0;
  const total = imagesToProcess.length;

  // Second pass: generate titles for images that need them (in parallel)
  const tasks = imagesToProcess.map((item, index) =>
    limit(async () => {
      const { album, filename, thumbnailPath } = item;

      if (isTTY) {
        console.log(`[${index + 1}/${total}] Processing: ${album}/${filename}`);
      }

      // Add small delay between requests to avoid bursting
      if (index > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, delayBetweenRequests)
        );
      }

      const generatedTitle = await generateImageTitle(
        openai,
        thumbnailPath,
        album,
        filename,
        db,
        languageName
      );
      completed++;

      // Report progress for non-TTY (SSE streaming)
      if (!isTTY) {
        const percent = Math.floor((completed / total) * 100);
        console.log(
          `[${completed}/${total}] (${percent}%) ${album}/${filename}`
        );
        // Send title update for real-time UI updates
        if (generatedTitle) {
          console.log(
            `TITLE_UPDATE:${JSON.stringify({
              album,
              filename,
              title: generatedTitle,
            })}`
          );
        }
      }
    })
  );

  await Promise.all(tasks);

  db.close();

  if (isTTY) {
    console.log("\n" + "=".repeat(50));
  } else {
    console.log("");
  }
  console.log("AI Title Generation Complete!");
  if (isTTY) {
    console.log("=".repeat(50));
  }
  console.log(`Processed: ${processedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  if (isTTY) {
    console.log("=".repeat(50));
  }
}

// Main execution
scanAndGenerateTitles()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
