#!/usr/bin/env node

/**
 * Remove Extra Keys from Translation Files
 * 
 * Removes keys from foreign language files that don't exist in English
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES_DIR = join(__dirname, "../frontend/src/i18n/locales");

/**
 * Get all keys from nested object
 */
function getAllKeys(obj, prefix = "", keys = []) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      getAllKeys(v, key, keys);
    } else {
      keys.push(key);
    }
  }
  return keys;
}

/**
 * Delete key from nested object using dot notation path
 */
function deleteNestedKey(obj, path) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  
  let current = obj;
  for (const key of keys) {
    if (!(key in current)) return false;
    current = current[key];
  }
  
  if (lastKey in current) {
    delete current[lastKey];
    
    // Clean up empty parent objects
    if (Object.keys(current).length === 0 && keys.length > 0) {
      deleteNestedKey(obj, keys.join("."));
    }
    
    return true;
  }
  
  return false;
}

/**
 * Process a single locale file
 */
function processLocaleFile(filePath, lang, enKeys) {
  try {
    const content = readFileSync(filePath, "utf8");
    const data = JSON.parse(content);
    
    const langKeys = getAllKeys(data);
    const extraKeys = langKeys.filter(key => !enKeys.has(key));
    
    if (extraKeys.length > 0) {
      let deleted = 0;
      
      for (const key of extraKeys) {
        if (deleteNestedKey(data, key)) {
          deleted++;
        }
      }
      
      if (deleted > 0) {
        writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
        return { deleted, extraKeys, error: null };
      }
    }
    
    return { deleted: 0, extraKeys: [], error: null };
  } catch (err) {
    return { deleted: 0, extraKeys: [], error: err.message };
  }
}

/**
 * Main function
 */
function main() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║   Remove Extra Keys from Translations             ║");
  console.log("╚════════════════════════════════════════════════════╝\n");
  
  // Load English as reference
  const enData = JSON.parse(readFileSync(join(LOCALES_DIR, "en.json"), "utf8"));
  const enKeys = new Set(getAllKeys(enData));
  
  console.log(`Reference: en.json has ${enKeys.size} keys\n`);
  
  const files = readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith(".json") && f !== "en.json")
    .sort();
  
  let totalDeleted = 0;
  const results = [];
  
  for (const file of files) {
    const lang = file.replace(".json", "");
    const filePath = join(LOCALES_DIR, file);
    
    const result = processLocaleFile(filePath, lang, enKeys);
    
    if (result.error) {
      console.log(`  ❌ ${lang}.json - Error: ${result.error}`);
      results.push({ lang, deleted: 0, error: result.error });
      continue;
    }
    
    if (result.deleted > 0) {
      console.log(`  ✓ ${lang}.json - Deleted ${result.deleted} extra key(s)`);
      result.extraKeys.forEach(key => console.log(`      - ${key}`));
      totalDeleted += result.deleted;
      results.push({ lang, deleted: result.deleted });
    }
  }
  
  if (totalDeleted === 0) {
    console.log("  ✨ No extra keys found - all translations are clean!\n");
  } else {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`Total: ${totalDeleted} extra key(s) deleted\n`);
  }
}

main();

