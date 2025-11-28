#!/usr/bin/env node

/**
 * Fix [EN] placeholders that contain translated text instead of English
 * Replaces them with the correct English values from en.json
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TRANSLATION_DIRS = [
  {
    name: "Frontend",
    path: join(__dirname, "../frontend/src/i18n/locales"),
  },
  {
    name: "Backend",
    path: join(__dirname, "../backend/src/i18n/locales"),
  },
];

/**
 * Get value from nested object using dot notation path
 */
function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Set value in nested object using dot notation path
 */
function setNestedValue(obj, path, value) {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * Recursively find all [EN] placeholders
 */
function findEnPlaceholders(obj, prefix = "", placeholders = []) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      findEnPlaceholders(value, fullKey, placeholders);
    } else if (typeof value === "string" && value.startsWith("[EN] ")) {
      placeholders.push({ key: fullKey, value: value.substring(5) });
    }
  }
  return placeholders;
}

/**
 * Process a directory
 */
function processDirectory(dirName, dirPath) {
  console.log(`\n📁 Processing ${dirName}...`);
  console.log("─".repeat(60));

  // Load English file
  const enFilePath = join(dirPath, "en.json");
  if (!existsSync(enFilePath)) {
    console.log(`  ❌ en.json not found`);
    return [];
  }

  let enData;
  try {
    const enContent = readFileSync(enFilePath, "utf8");
    enData = JSON.parse(enContent);
  } catch (err) {
    console.log(`  ❌ Error reading en.json: ${err.message}`);
    return [];
  }

  const results = [];
  const files = readdirSync(dirPath).filter((f) => f.endsWith(".json") && f !== "en.json");

  for (const file of files) {
    const langCode = file.replace(".json", "");
    const filePath = join(dirPath, file);

    try {
      const content = readFileSync(filePath, "utf8");
      const data = JSON.parse(content);

      const placeholders = findEnPlaceholders(data);
      let fixed = 0;

      for (const placeholder of placeholders) {
        const enValue = getNestedValue(enData, placeholder.key);
        
        // If English value exists and is different from current [EN] value, replace it
        if (enValue && typeof enValue === "string" && enValue !== placeholder.value) {
          setNestedValue(data, placeholder.key, `[EN] ${enValue}`);
          fixed++;
        }
      }

      if (fixed > 0) {
        writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
        console.log(`  ✓ ${langCode}.json - Fixed ${fixed} placeholder(s)`);
        results.push({ langCode, fixed });
      } else {
        console.log(`  ○ ${langCode}.json - No fixes needed`);
        results.push({ langCode, fixed: 0 });
      }
    } catch (err) {
      console.log(`  ❌ ${langCode}.json - Error: ${err.message}`);
      results.push({ langCode, fixed: 0, error: err.message });
    }
  }

  return results;
}

/**
 * Main function
 */
function main() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║   Fix [EN] Placeholders with English Values       ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  const allResults = [];

  for (const dir of TRANSLATION_DIRS) {
    const results = processDirectory(dir.name, dir.path);
    allResults.push({ name: dir.name, results });
  }

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("SUMMARY\n");

  let totalFixed = 0;
  for (const dir of allResults) {
    const dirTotal = dir.results.reduce((sum, r) => sum + r.fixed, 0);
    totalFixed += dirTotal;
    console.log(`${dir.name}: ${dirTotal} placeholder(s) fixed`);
  }

  console.log(`\nTotal: ${totalFixed} placeholder(s) fixed`);
  console.log("\n✨ Run 'node scripts/auto-translate.js' to translate all [EN] strings\n");
}

main();

