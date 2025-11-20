#!/usr/bin/env node

/**
 * Mark Untranslated Keys Script
 *
 * Finds keys that match English exactly (untranslated) and marks them with [EN] prefix
 * so they can be auto-translated.
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES_DIR = join(__dirname, "../frontend/src/i18n/locales");
const REFERENCE_LANG = "en";

// Universal words that shouldn't be translated
const UNIVERSAL_WORDS = new Set([
  "galleria",
  "openai",
  "google",
  "openobserve",
  "mfa",
  "smtp",
  "email",
  "url",
  "iso",
  "passkey",
  "min",
]);

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
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
 * Check if a string is a universal word that shouldn't be translated
 */
function isUniversalWord(str) {
  if (typeof str !== "string") return false;
  const lower = str.toLowerCase().trim();
  
  // Check exact matches
  if (UNIVERSAL_WORDS.has(lower)) return true;
  
  // Check if string contains any universal word (for multi-word phrases like "Google Cloud Console")
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (UNIVERSAL_WORDS.has(word)) return true;
  }
  
  // Check if it's mostly template variables
  if (
    str.match(/^{{[^}]+}}%?$/) ||
    str.match(/^[^a-zA-Z]*{{[^}]+}}[^a-zA-Z]*$/)
  )
    return true;

  // Very short words (1-2 chars) that might be universal
  if (str.length <= 2) return true;

  // URLs, email addresses, domain names
  if (
    str.includes("@") ||
    str.includes("://") ||
    str.includes(".com") ||
    str.includes(".ai") ||
    str.includes(".net") ||
    str.startsWith("/")
  )
    return true;

  // Technical paths and filenames
  if (str.match(/^[a-z-]+\.[a-z]+$/)) return true;

  return false;
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
    log(`Error loading ${lang}.json: ${error.message}`, "yellow");
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
    log(`Error saving ${lang}.json: ${error.message}`, "yellow");
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
 * Mark untranslated keys in a language file
 */
function markUntranslatedKeys(lang, referenceData, referenceKeys) {
  log(`\n🔍 Checking ${lang.toUpperCase()}...`, "cyan");

  const data = loadTranslationFile(lang);
  if (!data) return { marked: 0, skipped: 0 };

  let markedCount = 0;
  let skippedCount = 0;

  for (const key of referenceKeys) {
    const value = getNestedValue(data, key);
    const referenceValue = getNestedValue(referenceData, key);

    // Only process string values that match English exactly
    if (
      typeof value === "string" &&
      typeof referenceValue === "string" &&
      value === referenceValue &&
      value !== "" &&
      !value.startsWith("[EN] ") &&
      !isUniversalWord(value)
    ) {
      // Mark with [EN] prefix
      setNestedValue(data, key, `[EN] ${value}`);
      markedCount++;
    } else if (
      typeof value === "string" &&
      typeof referenceValue === "string" &&
      value === referenceValue &&
      !isUniversalWord(value)
    ) {
      // This is a universal word or already marked, skip it
      skippedCount++;
    }
  }

  if (markedCount > 0) {
    if (saveTranslationFile(lang, data)) {
      log(`  ✅ Marked ${markedCount} key(s) for translation`, "green");
      if (skippedCount > 0) {
        log(`  ⏭️  Skipped ${skippedCount} universal word(s)`, "yellow");
      }
      return { marked: markedCount, skipped: skippedCount };
    } else {
      log(`  ❌ Failed to save`, "yellow");
      return { marked: 0, skipped: skippedCount };
    }
  } else {
    log(`  ✓ No untranslated keys found`, "green");
    return { marked: 0, skipped: skippedCount };
  }
}

/**
 * Main function
 */
function main() {
  log("\n╔════════════════════════════════════════════════════╗", "cyan");
  log("║     Mark Untranslated Keys Tool                  ║", "cyan");
  log("╚════════════════════════════════════════════════════╝\n", "cyan");

  // Load reference translation
  const referenceData = loadTranslationFile(REFERENCE_LANG);
  if (!referenceData) {
    log("❌ Failed to load reference translation file (en.json)", "yellow");
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

  let totalMarked = 0;
  let totalSkipped = 0;

  // Process each language file
  for (const lang of languages) {
    const result = markUntranslatedKeys(lang, referenceData, referenceKeys);
    totalMarked += result.marked;
    totalSkipped += result.skipped;
  }

  // Summary
  log("\n" + "═".repeat(80), "cyan");
  log("SUMMARY", "cyan");
  log("═".repeat(80) + "\n", "cyan");

  log(`✅ Total keys marked: ${totalMarked}`, "green");
  if (totalSkipped > 0) {
    log(`⏭️  Total universal words skipped: ${totalSkipped}`, "yellow");
  }

  if (totalMarked > 0) {
    log("\n💡 Run `node scripts/auto-translate.js` to translate marked keys.", "cyan");
  } else {
    log("\n🎉 All keys are already translated or are universal words!", "green");
  }
}

main();
