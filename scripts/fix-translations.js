#!/usr/bin/env node

/**
 * Translation Auto-Fix Script
 *
 * This script:
 * 1. Adds missing keys from English to all language files
 * 2. Marks them with [EN] prefix so translators know they need translation
 * 3. Removes extra keys that don't exist in English
 * 4. Creates backup files before modifying
 */

import { readFileSync, writeFileSync, copyFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES_DIR = join(__dirname, "../frontend/src/i18n/locales");
const REFERENCE_LANG = "en";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Recursively get all keys from a nested object
 */
function getAllKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Get value from nested object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Set value in nested object using dot notation
 */
function setNestedValue(obj, path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!(key in current)) {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Remove key from nested object using dot notation
 */
function deleteNestedKey(obj, path) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => current?.[key], obj);
  if (target && lastKey in target) {
    delete target[lastKey];
  }
}

/**
 * Load and parse a JSON translation file
 */
function loadTranslationFile(lang) {
  try {
    const filePath = join(LOCALES_DIR, `${lang}.json`);
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    log(`Error loading ${lang}.json: ${error.message}`, "red");
    return null;
  }
}

/**
 * Save translation file with pretty formatting
 */
function saveTranslationFile(lang, data) {
  try {
    const filePath = join(LOCALES_DIR, `${lang}.json`);
    const content = JSON.stringify(data, null, 2) + "\n";
    writeFileSync(filePath, content, "utf-8");
    return true;
  } catch (error) {
    log(`Error saving ${lang}.json: ${error.message}`, "red");
    return false;
  }
}

/**
 * Create backup of translation file
 */
function createBackup(lang) {
  try {
    const filePath = join(LOCALES_DIR, `${lang}.json`);
    const backupPath = join(LOCALES_DIR, `${lang}.json.backup`);
    copyFileSync(filePath, backupPath);
    return true;
  } catch (error) {
    log(`Error creating backup for ${lang}.json: ${error.message}`, "red");
    return false;
  }
}

/**
 * Get list of language files to process
 */
function getLanguageFiles() {
  return readdirSync(LOCALES_DIR)
    .filter((file) => file.endsWith(".json") && !file.includes(".backup"))
    .map((file) => file.replace(".json", ""))
    .filter((lang) => lang !== REFERENCE_LANG);
}

/**
 * Check if string is already marked as needing translation
 */
function isMarkedAsNeedsTranslation(value) {
  if (typeof value !== "string") return false;
  return value.startsWith("[EN] ") || value.startsWith("[TRANSLATE] ");
}

/**
 * Mark English text for translation
 */
function markForTranslation(englishValue) {
  if (typeof englishValue !== "string") return englishValue;
  // Don't mark empty strings or spacers
  if (englishValue === "") return "";
  return `[EN] ${englishValue}`;
}

/**
 * Fix translation file by adding missing keys
 */
function fixTranslationFile(lang, referenceData, referenceKeys) {
  log(`\n🔧 Fixing ${lang.toUpperCase()}...`, "cyan");

  const data = loadTranslationFile(lang);
  if (!data) return false;

  // Create backup
  if (!createBackup(lang)) {
    log(`  ⚠️  Could not create backup, skipping...`, "yellow");
    return false;
  }

  const existingKeys = getAllKeys(data);
  const existingSet = new Set(existingKeys);
  const referenceSet = new Set(referenceKeys);

  // Find missing and extra keys
  const missing = referenceKeys.filter((key) => !existingSet.has(key));
  const extra = existingKeys.filter((key) => !referenceSet.has(key));

  let addedCount = 0;
  let removedCount = 0;

  // Add missing keys
  if (missing.length > 0) {
    log(`  📥 Adding ${missing.length} missing key(s)...`, "yellow");
    for (const key of missing) {
      const englishValue = getNestedValue(referenceData, key);
      const markedValue = markForTranslation(englishValue);
      setNestedValue(data, key, markedValue);
      addedCount++;
    }
  }

  // Remove extra keys
  if (extra.length > 0) {
    log(`  🗑️  Removing ${extra.length} extra key(s)...`, "yellow");
    for (const key of extra) {
      deleteNestedKey(data, key);
      removedCount++;
    }
  }

  // Save fixed file
  if (addedCount > 0 || removedCount > 0) {
    if (saveTranslationFile(lang, data)) {
      log(
        `  ✅ Fixed! Added: ${addedCount}, Removed: ${removedCount}`,
        "green"
      );
      return true;
    } else {
      log(`  ❌ Failed to save`, "red");
      return false;
    }
  } else {
    log(`  ✓ No changes needed`, "green");
    return true;
  }
}

/**
 * Main function
 */
function main() {
  log("\n╔════════════════════════════════════════════════════╗", "cyan");
  log("║     Translation Auto-Fix Tool                    ║", "cyan");
  log("╚════════════════════════════════════════════════════╝\n", "cyan");

  // Load reference translation
  const referenceData = loadTranslationFile(REFERENCE_LANG);
  if (!referenceData) {
    log("❌ Failed to load reference translation file (en.json)", "red");
    process.exit(1);
  }

  const referenceKeys = getAllKeys(referenceData);
  log(`📚 Reference Language: ${REFERENCE_LANG.toUpperCase()}`, "bold");
  log(`📊 Total Keys: ${referenceKeys.length}\n`, "bold");

  // Get all language files
  const languages = getLanguageFiles();

  if (languages.length === 0) {
    log("⚠️  No translation files found!", "yellow");
    return;
  }

  log(`🌍 Processing ${languages.length} language(s)...\n`, "bold");

  let successCount = 0;
  let failCount = 0;

  // Fix each language file
  for (const lang of languages) {
    if (fixTranslationFile(lang, referenceData, referenceKeys)) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Summary
  log("\n" + "═".repeat(80), "cyan");
  log("SUMMARY", "cyan");
  log("═".repeat(80) + "\n", "cyan");

  log(`✅ Successfully fixed: ${successCount}`, "green");
  if (failCount > 0) {
    log(`❌ Failed: ${failCount}`, "red");
  }

  log("\n💡 Note: Keys marked with [EN] need translation.", "yellow");
  log("   Backup files (.json.backup) have been created.\n", "yellow");

  if (failCount === 0) {
    log("🎉 All translation files have been fixed!", "green");
  }
}

main();
