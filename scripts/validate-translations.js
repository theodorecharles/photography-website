#!/usr/bin/env node

/**
 * Translation Validation Script
 *
 * This script:
 * 1. Validates that all translation files have the same keys as English
 * 2. Reports missing keys in each language
 * 3. Reports extra keys that don't exist in English
 * 4. Checks for empty values
 * 5. Provides a summary report
 */

import { readFileSync, readdirSync } from "fs";
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
 * Get all language files (excluding Python scripts)
 */
function getLanguageFiles() {
  return readdirSync(LOCALES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(".json", ""));
}

/**
 * Compare two sets of keys and return differences
 */
function compareKeys(referenceKeys, targetKeys) {
  const refSet = new Set(referenceKeys);
  const targetSet = new Set(targetKeys);

  const missing = referenceKeys.filter((key) => !targetSet.has(key));
  const extra = targetKeys.filter((key) => !refSet.has(key));

  return { missing, extra };
}

/**
 * Words that are legitimately the same across languages
 */
const UNIVERSAL_WORDS = new Set([
  // Brand names (should NEVER be translated)
  "galleria",
  "openai",
  "google",
  "openobserve",
  
  // Technical identifiers (should NEVER be translated)
  "mfa",
  "smtp",
  "oauth",
  "api",
  "json",
  "url",
  "iso",
  
  // Placeholder names (universal across languages)
  "john",
  "doe",
  
  // Very short measurement units
  "min",
]);

/**
 * Check if a string is likely a legitimate universal word
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

  // Check if it's mostly template variables (including multi-variable templates)
  if (
    str.match(/^{{[^}]+}}%?$/) ||
    str.match(/^[^a-zA-Z]*{{[^}]+}}[^a-zA-Z]*$/) ||
    str.match(/{{[^}]+}}\s*-\s*{{[^}]+}}/) ||  // Template like "{{var1}} - {{var2}}"
    str.match(/"{{[^}]+}}"/)  // Template in quotes like "{{folderName}}"
  )
    return true;
  
  // Password placeholder dots (should stay universal)
  if (str.match(/^[•]+$/)) return true;
  
  // Emoji-prefixed strings (often universal)
  if (str.match(/^[⚠️💡✓❌🔑📧]/)) return true;

  // Very short words (1-2 chars) that might be universal
  if (str.length <= 2) return true;

  // Proper nouns (capitalized words)
  if (/^[A-Z][a-z]*$/.test(str) && UNIVERSAL_WORDS.has(lower)) return true;

  // URLs, email addresses, domain names (placeholders that shouldn't be translated)
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
  if (str.match(/^[a-z-]+\.[a-z]+$/)) return true; // file.ext pattern

  // Technical placeholders (e.g., "GOCSPX-xxxxx", "xxx-xxx-xxx")
  if (str.match(/xxxxx|xxx-|placeholder/i)) return true;

  return false;
}

/**
 * Check for empty, placeholder, or untranslated values
 */
function checkEmptyValues(data, lang, allKeys, referenceData) {
  const emptyKeys = [];
  const placeholderKeys = [];
  const untranslatedKeys = [];

  for (const key of allKeys) {
    const value = getNestedValue(data, key);
    const referenceValue = getNestedValue(referenceData, key);

    // Only flag as empty if the reference value is NOT empty
    if (value === "" || value === null || value === undefined) {
      // If reference is also empty, this is intentional (e.g., spacer)
      if (
        referenceValue !== "" &&
        referenceValue !== null &&
        referenceValue !== undefined
      ) {
        emptyKeys.push(key);
      }
    } else if (typeof value === "string") {
      // Check for [EN] prefix from auto-fix script
      if (value.startsWith("[EN] ")) {
        placeholderKeys.push(key);
      }
      // Check for common placeholder patterns
      else {
        const lowerValue = value.toLowerCase();
        if (
          lowerValue === "todo" ||
          lowerValue === "tbd" ||
          lowerValue === "fixme" ||
          lowerValue === "[translation needed]"
        ) {
          placeholderKeys.push(key);
        }
      }

      // Check if value matches English exactly (untranslated)
      if (
        typeof referenceValue === "string" &&
        value === referenceValue &&
        value !== "" &&
        !value.startsWith("[EN] ") &&
        !isUniversalWord(value)
      ) {
        untranslatedKeys.push({ key, value });
      }
    }
  }

  return { emptyKeys, placeholderKeys, untranslatedKeys };
}

/**
 * Calculate translation completeness percentage
 */
function calculateCompleteness(
  referenceCount,
  missingCount,
  emptyCount,
  placeholderCount,
  untranslatedCount
) {
  const totalIssues =
    missingCount + emptyCount + placeholderCount + untranslatedCount;
  return Math.max(
    0,
    ((referenceCount - totalIssues) / referenceCount) * 100
  ).toFixed(1);
}

/**
 * Main validation function
 */
function validateTranslations() {
  log("\n╔════════════════════════════════════════════════════╗", "cyan");
  log("║     Translation Validation Report                 ║", "cyan");
  log("╚════════════════════════════════════════════════════╝\n", "cyan");

  // Load reference translation
  const referenceData = loadTranslationFile(REFERENCE_LANG);
  if (!referenceData) {
    log("Failed to load reference translation file (en.json)", "red");
    process.exit(1);
  }

  const referenceKeys = getAllKeys(referenceData);
  log(`📚 Reference Language: ${REFERENCE_LANG.toUpperCase()}`, "bold");
  log(`📊 Total Keys: ${referenceKeys.length}\n`, "bold");

  // Get all language files
  const languages = getLanguageFiles().filter(
    (lang) => lang !== REFERENCE_LANG
  );

  if (languages.length === 0) {
    log("⚠️  No translation files found!", "yellow");
    return;
  }

  const results = [];
  let allValid = true;

  // Validate each language
  for (const lang of languages) {
    const data = loadTranslationFile(lang);
    if (!data) continue;

    const keys = getAllKeys(data);
    const { missing, extra } = compareKeys(referenceKeys, keys);
    const { emptyKeys, placeholderKeys, untranslatedKeys } = checkEmptyValues(
      data,
      lang,
      keys,
      referenceData
    );

    const completeness = calculateCompleteness(
      referenceKeys.length,
      missing.length,
      emptyKeys.length,
      placeholderKeys.length,
      untranslatedKeys.length
    );

    results.push({
      lang,
      totalKeys: keys.length,
      missing,
      extra,
      emptyKeys,
      placeholderKeys,
      untranslatedKeys,
      completeness: parseFloat(completeness),
    });

    if (
      missing.length > 0 ||
      extra.length > 0 ||
      emptyKeys.length > 0 ||
      placeholderKeys.length > 0 ||
      untranslatedKeys.length > 0
    ) {
      allValid = false;
    }
  }

  // Sort by completeness (ascending) to show problematic ones first
  results.sort((a, b) => a.completeness - b.completeness);

  // Display results
  log("═".repeat(80), "cyan");
  log("LANGUAGE ANALYSIS", "cyan");
  log("═".repeat(80) + "\n", "cyan");

  for (const result of results) {
    const status = result.completeness === 100 ? "✅" : "⚠️";
    const color = result.completeness === 100 ? "green" : "yellow";

    log(
      `${status} ${result.lang.toUpperCase().padEnd(10)} ${
        result.completeness
      }% complete`,
      color
    );
    log(`   Keys: ${result.totalKeys}`, "reset");

    if (result.missing.length > 0) {
      log(`   ❌ Missing: ${result.missing.length} key(s)`, "red");
      if (result.missing.length <= 10) {
        result.missing.forEach((key) => log(`      - ${key}`, "red"));
      } else {
        result.missing
          .slice(0, 5)
          .forEach((key) => log(`      - ${key}`, "red"));
        log(`      ... and ${result.missing.length - 5} more`, "red");
      }
    }

    if (result.extra.length > 0) {
      log(
        `   ⚡ Extra: ${result.extra.length} key(s) (not in English)`,
        "yellow"
      );
      if (result.extra.length <= 5) {
        result.extra.forEach((key) => log(`      + ${key}`, "yellow"));
      }
    }

    if (result.emptyKeys.length > 0) {
      log(`   🔴 Empty: ${result.emptyKeys.length} key(s)`, "red");
      if (result.emptyKeys.length <= 5) {
        result.emptyKeys.forEach((key) => log(`      - ${key}`, "red"));
      }
    }

    if (result.placeholderKeys.length > 0) {
      log(
        `   🟡 Placeholder [EN]: ${result.placeholderKeys.length} key(s)`,
        "yellow"
      );
      if (result.placeholderKeys.length <= 5) {
        result.placeholderKeys.forEach((key) =>
          log(`      - ${key}`, "yellow")
        );
      } else {
        result.placeholderKeys
          .slice(0, 3)
          .forEach((key) => log(`      - ${key}`, "yellow"));
        log(
          `      ... and ${result.placeholderKeys.length - 3} more`,
          "yellow"
        );
      }
    }

    if (result.untranslatedKeys.length > 0) {
      log(
        `   🔶 Untranslated (matches English): ${result.untranslatedKeys.length} key(s)`,
        "yellow"
      );
      if (result.untranslatedKeys.length <= 5) {
        result.untranslatedKeys.forEach((item) =>
          log(`      - ${item.key}: "${item.value}"`, "yellow")
        );
      } else {
        result.untranslatedKeys
          .slice(0, 3)
          .forEach((item) =>
            log(`      - ${item.key}: "${item.value}"`, "yellow")
          );
        log(
          `      ... and ${result.untranslatedKeys.length - 3} more`,
          "yellow"
        );
      }
    }

    console.log();
  }

  // Summary statistics
  log("═".repeat(80), "cyan");
  log("SUMMARY", "cyan");
  log("═".repeat(80) + "\n", "cyan");

  const avgCompleteness = (
    results.reduce((sum, r) => sum + r.completeness, 0) / results.length
  ).toFixed(1);

  const perfectLangs = results.filter((r) => r.completeness === 100).length;
  const incompleteLangs = results.filter((r) => r.completeness < 100).length;

  const totalPlaceholders = results.reduce(
    (sum, r) => sum + r.placeholderKeys.length,
    0
  );
  const totalUntranslated = results.reduce(
    (sum, r) => sum + r.untranslatedKeys.length,
    0
  );

  log(`📊 Total Languages: ${results.length}`, "bold");
  log(`✅ Complete: ${perfectLangs}`, "green");
  log(
    `⚠️  Incomplete: ${incompleteLangs}`,
    incompleteLangs > 0 ? "yellow" : "green"
  );
  log(`📈 Average Completeness: ${avgCompleteness}%`, "bold");

  if (totalPlaceholders > 0) {
    log(`🟡 Keys marked [EN]: ${totalPlaceholders}`, "yellow");
  }
  if (totalUntranslated > 0) {
    log(`🔶 Untranslated keys: ${totalUntranslated}`, "yellow");
  }

  console.log();

  // Allow deployment if average completeness is > 95%
  const deploymentThreshold = 95.0;

  if (allValid) {
    log("🎉 All translations are complete and valid!", "green");
    process.exit(0);
  } else if (parseFloat(avgCompleteness) >= deploymentThreshold) {
    log(
      `✅ Translation quality acceptable (${avgCompleteness}% ≥ ${deploymentThreshold}%)`,
      "green"
    );
    if (totalPlaceholders > 0 || totalUntranslated > 0) {
      log("\n⚠️  Minor issues detected (won't block deployment):", "yellow");
      if (totalPlaceholders > 0) {
        log(
          `   - ${totalPlaceholders} keys marked with [EN] need actual translation`,
          "yellow"
        );
      }
      if (totalUntranslated > 0) {
        log(
          `   - ${totalUntranslated} keys match English (may be OK for technical terms)`,
          "yellow"
        );
      }
    }
    process.exit(0);
  } else {
    log(
      `❌ Translation quality below deployment threshold (${avgCompleteness}% < ${deploymentThreshold}%)`,
      "yellow"
    );
    if (totalPlaceholders > 0 || totalUntranslated > 0) {
      log("\n⚠️  Translation quality issues detected:", "yellow");
      if (totalPlaceholders > 0) {
        log("   - Keys marked with [EN] need actual translation", "yellow");
      }
      if (totalUntranslated > 0) {
        log(
          "   - Some translations match English exactly (likely untranslated)",
          "yellow"
        );
      }
      log(
        "\n💡 Run `node scripts/fix-translations.js` to add [EN] markers to missing keys.",
        "cyan"
      );
      log(
        "💡 Run `node scripts/auto-translate.js` to translate [EN] placeholders.",
        "cyan"
      );
    } else {
      log("⚠️  Some translations need attention. See details above.", "yellow");
    }
    process.exit(1);
  }
}

// Run validation
validateTranslations();
