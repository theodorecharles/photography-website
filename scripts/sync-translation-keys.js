#!/usr/bin/env node

/**
 * Sync Translation Keys Script
 *
 * Finds keys that exist in en.json but are missing in other languages
 * Adds missing keys with [EN] prefix so they can be auto-translated
 * Works with BOTH frontend and backend translation files
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
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

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  blue: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Get all keys from an object with their values (nested)
 * Returns object with dot-notation paths as keys
 */
function getAllKeysWithValues(obj, prefix = "") {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Recurse into nested objects
      Object.assign(result, getAllKeysWithValues(value, fullKey));
    } else {
      // Leaf node - store key and value
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Set value in nested object using dot notation
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
 * Get value from nested object using dot notation
 */
function getNestedValue(obj, path) {
  const keys = path.split(".");
  let current = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Sync missing keys for a single language file
 */
function syncLanguageFile(referenceKeysWithValues, filePath, langCode) {
  try {
    // Read the target language file
    const content = readFileSync(filePath, "utf8");
    const data = JSON.parse(content);
    const existingKeys = getAllKeysWithValues(data);

    // Find missing keys
    const missingKeys = [];
    for (const [key, value] of Object.entries(referenceKeysWithValues)) {
      if (!(key in existingKeys)) {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length === 0) {
      return {
        langCode,
        success: true,
        added: 0,
      };
    }

    // Add missing keys with [EN] prefix
    for (const key of missingKeys) {
      const englishValue = referenceKeysWithValues[key];
      const valueToAdd =
        typeof englishValue === "string" ? `[EN] ${englishValue}` : englishValue;
      setNestedValue(data, key, valueToAdd);
    }

    // Write back to file with proper formatting
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");

    return {
      langCode,
      success: true,
      added: missingKeys.length,
      keys: missingKeys,
    };
  } catch (error) {
    return {
      langCode,
      success: false,
      error: error.message,
      added: 0,
    };
  }
}

/**
 * Sync all translations in a directory
 */
function syncTranslationDir(dirName, dirPath) {
  log(`\n${colors.cyan}${colors.bold}${dirName} Translations${colors.reset}`);
  log(`${colors.cyan}${"═".repeat(60)}${colors.reset}\n`);

  // Load reference (en.json)
  const referenceFile = join(dirPath, "en.json");

  if (!existsSync(referenceFile)) {
    log(`  ✗ Reference file not found: en.json`, "red");
    return { success: false, totalAdded: 0, filesModified: 0 };
  }

  let referenceData, referenceKeysWithValues;

  try {
    referenceData = JSON.parse(readFileSync(referenceFile, "utf8"));
    referenceKeysWithValues = getAllKeysWithValues(referenceData);
    log(
      `📋 Reference: en.json (${Object.keys(referenceKeysWithValues).length} keys)\n`
    );
  } catch (error) {
    log(`  ✗ Error reading en.json: ${error.message}`, "red");
    return { success: false, totalAdded: 0, filesModified: 0 };
  }

  // Get all translation files
  const files = readdirSync(dirPath).filter(
    (f) => f.endsWith(".json") && f !== "en.json"
  );

  // Sync each file
  const results = [];
  let totalAdded = 0;
  let filesModified = 0;

  for (const file of files) {
    const langCode = file.replace(".json", "");
    const filePath = join(dirPath, file);

    const result = syncLanguageFile(
      referenceKeysWithValues,
      filePath,
      langCode
    );
    results.push(result);

    if (result.success) {
      if (result.added > 0) {
        log(
          `✓ ${langCode}.json - Added ${result.added} missing key(s)`,
          "green"
        );
        totalAdded += result.added;
        filesModified++;
      } else {
        log(`✓ ${langCode}.json - Already in sync`, "green");
      }
    } else {
      log(`✗ ${langCode}.json - ERROR: ${result.error}`, "red");
    }
  }

  log("");

  return {
    success: true,
    totalAdded,
    filesModified,
    totalFiles: files.length,
  };
}

/**
 * Main function
 */
function main() {
  log("\n" + colors.cyan);
  log("╔════════════════════════════════════════════════════╗");
  log("║     Sync Translation Keys                         ║");
  log("╚════════════════════════════════════════════════════╝");
  log(colors.reset);

  const allResults = [];

  // Sync each directory
  for (const dir of TRANSLATION_DIRS) {
    const result = syncTranslationDir(dir.name, dir.path);
    allResults.push({ name: dir.name, ...result });
  }

  // Overall summary
  log(`${colors.cyan}${colors.bold}SUMMARY${colors.reset}`);
  log(`${colors.cyan}${"═".repeat(60)}${colors.reset}\n`);

  let totalAdded = 0;
  let totalFilesModified = 0;

  for (const result of allResults) {
    totalAdded += result.totalAdded;
    totalFilesModified += result.filesModified;

    if (result.totalAdded > 0) {
      log(
        `${result.name}: ${result.filesModified}/${result.totalFiles} files modified, ${result.totalAdded} keys added`,
        "green"
      );
    } else {
      log(
        `${result.name}: All ${result.totalFiles} files in sync ✓`,
        "green"
      );
    }
  }

  log("");

  if (totalAdded > 0) {
    log(
      `${colors.green}${colors.bold}✓ Added ${totalAdded} missing key(s) across ${totalFilesModified} file(s)${colors.reset}`
    );
    log(
      `${colors.yellow}  Run 'node scripts/auto-translate.js' to translate the [EN] placeholders${colors.reset}\n`
    );
  } else {
    log(
      `${colors.green}${colors.bold}✓ All translation files are in sync!${colors.reset}`
    );
    log(`${colors.green}  No missing keys found${colors.reset}\n`);
  }
}

main();
