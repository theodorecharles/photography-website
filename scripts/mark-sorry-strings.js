#!/usr/bin/env node

/**
 * Mark Sorry Strings for Retranslation
 * 
 * Finds all keys in English file that contain "sorry" or "Sorry"
 * and marks those same keys in all other language files with [EN] prefix
 * so they can be retranslated by auto-translate.js
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

// Keys that should never be translated (example values, not user-facing text)
const EXCLUDE_KEYS = new Set([
  "googleClientIdPlaceholder",
  "googleClientSecretPlaceholder",
  "emailPlaceholder",
  "confirmPasswordPlaceholder",
]);

/**
 * Recursively find all keys with "sorry" in English file
 */
function findSorryKeys(obj, prefix = "", sorryKeys = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    // Skip keys that should never be translated
    if (EXCLUDE_KEYS.has(key)) {
      continue;
    }
    
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      findSorryKeys(value, fullKey, sorryKeys);
    } else if (typeof value === "string") {
      // Check if string contains "sorry" (case-insensitive)
      if (/sorry/i.test(value)) {
        sorryKeys.add(fullKey);
      }
    }
  }
  return sorryKeys;
}

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
 * Recursively find and mark any strings containing "sorry" in an object
 * This catches OpenAI error messages that may have been translated
 * Replaces with English value from enData if available
 */
function findAndMarkSorryStrings(obj, prefix = "", marked = [], enData = null) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    // Skip keys that should never be translated
    if (EXCLUDE_KEYS.has(key)) {
      continue;
    }
    
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      findAndMarkSorryStrings(value, fullKey, marked, enData);
    } else if (typeof value === "string") {
      // Check if string contains "sorry" (case-insensitive)
      // If it does, it's definitely an OpenAI error message
      if (/sorry/i.test(value)) {
        // Skip if already prefixed with [EN]
        if (!value.startsWith("[EN] ")) {
          // Use English value if available, otherwise use current value
          const enValue = enData ? getNestedValue(enData, fullKey) : null;
          const textToUse = (enValue && typeof enValue === "string") ? enValue : value;
          obj[key] = `[EN] ${textToUse}`;
          marked.push(fullKey);
        }
      }
    }
  }
  return marked;
}

/**
 * Mark sorry keys in a target file (from English file keys)
 * Replaces with English value from en.json
 */
function markSorryKeysInFile(data, sorryKeys, enData) {
  const marked = [];
  
  for (const key of sorryKeys) {
    const value = getNestedValue(data, key);
    const enValue = enData ? getNestedValue(enData, key) : null;
    
    // Only mark if value exists and is a string
    if (typeof value === "string") {
      // Skip if already prefixed with [EN]
      if (!value.startsWith("[EN] ")) {
        // Use English value if available, otherwise use current value
        const textToUse = (enValue && typeof enValue === "string") ? enValue : value;
        setNestedValue(data, key, `[EN] ${textToUse}`);
        marked.push(key);
      }
    }
  }
  
  return marked;
}

/**
 * Recursively get all keys and values from an object
 */
function getAllKeyValuePairs(obj, prefix = "", pairs = []) {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      getAllKeyValuePairs(value, fullKey, pairs);
    } else if (typeof value === "string") {
      pairs.push({ key: fullKey, value });
    }
  }
  return pairs;
}

/**
 * Check if a string looks like an OpenAI error message
 * Common patterns: "I'm sorry", "I can't assist", "cannot assist", etc.
 */
function looksLikeOpenAIError(str) {
  if (typeof str !== "string") return false;
  const lower = str.toLowerCase();
  
  // Check for English "sorry" (catches untranslated errors)
  if (/sorry/i.test(str)) return true;
  
  // Check for common error message patterns in various languages
  // These are translations of "I'm sorry, I can't assist with that request"
  const errorPatterns = [
    /cannot assist/i,
    /can't assist/i,
    /can not assist/i,
    /tidak dapat membantu/i,        // Malay/Indonesian
    /maaf.*tidak.*bantu/i,         // Malay/Indonesian variations
    /saya.*maaf.*tidak.*bantu/i,   // Malay/Indonesian (I'm sorry, I can't help)
    /paenitet.*non.*poss/i,        // Latin
    /non possum/i,                  // Latin
    /non possum.*adiuvare/i,        // Latin (cannot assist)
    /не могу помочь/i,              // Russian
    /не можу/i,                     // Ukrainian/Serbian
    /nemohu pomoci/i,               // Czech
    /nemôžem pomôcť/i,              // Slovak
    /nemogu pomoći/i,               // Croatian/Serbian
    /ကျွန်ုပ်စိတ်မကောင်းပါ/i,        // Burmese (I'm sorry)
    /ကူညီပေးလို့မရပါဘူး/i,            // Burmese (can't help)
    /စိတ်မကောင်းပါ.*ကူညီ.*မရ/i,      // Burmese variations
  ];
  
  return errorPatterns.some(pattern => pattern.test(str));
}

/**
 * Process a single locale file
 */
function processLocaleFile(filePath, langCode, sorryKeys, enData) {
  // Skip English files (we don't want to mark English strings)
  if (langCode === "en") {
    return { skipped: true, marked: [] };
  }

  if (!existsSync(filePath)) {
    return { skipped: false, marked: [], error: "File not found" };
  }

  try {
    const content = readFileSync(filePath, "utf8");
    const data = JSON.parse(content);

    const marked = [];
    
    // First, mark keys that match English "sorry" keys (if any)
    const markedFromKeys = markSorryKeysInFile(data, sorryKeys, enData);
    marked.push(...markedFromKeys);
    
    // Also, find and mark any strings containing "sorry" directly (English word)
    const markedFromScan = findAndMarkSorryStrings(data, "", [], enData);
    marked.push(...markedFromScan);
    
    // Finally, compare with English and mark strings that look like error messages
    if (enData) {
      const allPairs = getAllKeyValuePairs(data);
      for (const pair of allPairs) {
        const enValue = getNestedValue(enData, pair.key);
        
        // If English value exists and is reasonable, but translation looks like an error
        if (enValue && typeof enValue === "string" && enValue.length > 0) {
          // Skip if already marked
          if (pair.value.startsWith("[EN] ")) continue;
          
          // Skip excluded keys
          const keyParts = pair.key.split(".");
          if (keyParts.some(k => EXCLUDE_KEYS.has(k))) continue;
          
          // If English is a normal string but translation looks like an error message
          if (!looksLikeOpenAIError(enValue) && looksLikeOpenAIError(pair.value)) {
            // Use English value, not the error message
            setNestedValue(data, pair.key, `[EN] ${enValue}`);
            marked.push(pair.key);
          }
        }
      }
    }
    
    const allMarked = [...new Set(marked)];

    if (allMarked.length > 0) {
      // Write back to file
      writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
      return { skipped: false, marked: allMarked, error: null };
    }

    return { skipped: false, marked: [], error: null };
  } catch (err) {
    return { skipped: false, marked: [], error: err.message };
  }
}

/**
 * Process all locale files in a directory
 */
function processDirectory(dirName, dirPath) {
  console.log(`\n📁 Processing ${dirName}...`);
  console.log("─".repeat(60));

  // Load English file for comparison
  const enFilePath = join(dirPath, "en.json");
  let sorryKeys = new Set();
  let enData = null;
  
  if (existsSync(enFilePath)) {
    try {
      const enContent = readFileSync(enFilePath, "utf8");
      enData = JSON.parse(enContent);
      sorryKeys = findSorryKeys(enData);
      if (sorryKeys.size > 0) {
        console.log(`  📋 Found ${sorryKeys.size} key(s) with "sorry" in English\n`);
      }
    } catch (err) {
      console.log(`  ⚠️  Error reading en.json: ${err.message}\n`);
    }
  }

  const results = [];
  const files = readdirSync(dirPath).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const langCode = file.replace(".json", "");
    const filePath = join(dirPath, file);

    const result = processLocaleFile(filePath, langCode, sorryKeys, enData);

    if (result.skipped) {
      console.log(`  ⏭️  ${langCode}.json (skipped - English)`);
      continue;
    }

    if (result.error) {
      console.log(`  ❌ ${langCode}.json - Error: ${result.error}`);
      results.push({ langCode, marked: 0, error: result.error });
      continue;
    }

    if (result.marked.length > 0) {
      console.log(`  ✓ ${langCode}.json - Marked ${result.marked.length} string(s)`);
      results.push({ langCode, marked: result.marked.length, keys: result.marked });
    } else {
      console.log(`  ○ ${langCode}.json - No sorry strings found`);
      results.push({ langCode, marked: 0 });
    }
  }

  return results;
}

/**
 * Main function
 */
function main() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║   Mark Sorry Strings for Retranslation             ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  const allResults = [];

  for (const dir of TRANSLATION_DIRS) {
    const results = processDirectory(dir.name, dir.path);
    allResults.push({ name: dir.name, results });
  }

  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("SUMMARY\n");

  let totalMarked = 0;
  for (const dir of allResults) {
    const dirTotal = dir.results.reduce((sum, r) => sum + r.marked, 0);
    totalMarked += dirTotal;
    console.log(`${dir.name}: ${dirTotal} string(s) marked`);
  }

  console.log(`\nTotal: ${totalMarked} string(s) marked for retranslation`);
  console.log("\n✨ Run 'node scripts/auto-translate.js' to retranslate all [EN] strings\n");
}

main();

