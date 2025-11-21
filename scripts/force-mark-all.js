#!/usr/bin/env node

/**
 * Force Mark All Untranslated Keys
 * 
 * This script aggressively marks EVERY key that matches English with [EN] prefix
 * No exceptions, no whitelisting - just mark everything that needs translation
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES_DIR = join(__dirname, "../frontend/src/i18n/locales");
const REFERENCE_LANG = "en";

// Colors
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getAllKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push({ key: fullKey, value });
    }
  }
  return keys;
}

function setNestedValue(obj, path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  let current = obj;
  
  for (const key of keys) {
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

// Load English reference
const enPath = join(LOCALES_DIR, `${REFERENCE_LANG}.json`);
const enData = JSON.parse(readFileSync(enPath, "utf-8"));
const enKeys = getAllKeys(enData);

log("\n╔════════════════════════════════════════════════════╗", "cyan");
log("║     Force Mark All Untranslated Keys             ║", "cyan");
log("╚════════════════════════════════════════════════════╝\n", "cyan");

log(`📚 Reference: English`, "bold");
log(`📊 Total Keys: ${enKeys.length}\n`, "bold");

// Get all language files except English
const langFiles = readdirSync(LOCALES_DIR)
  .filter((file) => file.endsWith(".json") && file !== "en.json")
  .map((file) => file.replace(".json", ""));

let totalMarked = 0;

for (const lang of langFiles) {
  const langPath = join(LOCALES_DIR, `${lang}.json`);
  const langData = JSON.parse(readFileSync(langPath, "utf-8"));
  
  let markedCount = 0;
  
  for (const { key, value } of enKeys) {
    const langValue = getNestedValue(langData, key);
    
    // If the value exists and matches English exactly
    if (
      typeof langValue === "string" &&
      typeof value === "string" &&
      langValue === value &&
      langValue !== "" &&
      !langValue.startsWith("[EN] ")
    ) {
      // Prefix with [EN]
      setNestedValue(langData, key, `[EN] ${langValue}`);
      markedCount++;
    }
  }
  
  if (markedCount > 0) {
    // Save the modified file
    writeFileSync(langPath, JSON.stringify(langData, null, 2) + "\n", "utf-8");
    log(`✅ ${lang.toUpperCase()}: Marked ${markedCount} key(s)`, "green");
    totalMarked += markedCount;
  } else {
    log(`✓ ${lang.toUpperCase()}: No keys to mark`, "cyan");
  }
}

log("\n════════════════════════════════════════════════════", "cyan");
log(`Total keys marked: ${totalMarked}`, "bold");
log("\n💡 Run: node scripts/auto-translate.js", "cyan");

