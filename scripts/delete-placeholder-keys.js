#!/usr/bin/env node

/**
 * Delete Placeholder Keys from All Translation Files
 * 
 * Removes hardcoded placeholder values from translation files
 * since they're now hardcoded in the UI components
 */

import { readFileSync, writeFileSync, readdirSync } from "fs";
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

// Keys to delete (example values that are now hardcoded in UI)
const KEYS_TO_DELETE = [
  "oobe.emailPlaceholder",
  "oobe.fullNamePlaceholder",
  "oobe.confirmPasswordPlaceholder",
  "oobe.passwordPlaceholder",  // Only the ••••••••  one
  "oobe.googleClientIdPlaceholder",
  "oobe.googleClientSecretPlaceholder",
  "testEmailModal.emailPlaceholder",
  "smtpSettings.hostPlaceholder",
  "smtpSettings.usernamePlaceholder",
  "smtpSettings.fromNamePlaceholder",
  "smtpSettings.fromAddressPlaceholder",
];

/**
 * Get value from nested object using dot notation path
 */
function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
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
    return true;
  }
  
  return false;
}

/**
 * Process a single locale file
 */
function processLocaleFile(filePath, langCode) {
  try {
    const content = readFileSync(filePath, "utf8");
    const data = JSON.parse(content);
    
    let deleted = 0;
    
    for (const key of KEYS_TO_DELETE) {
      // Special handling for passwordPlaceholder - only delete if it's dots
      if (key === "oobe.passwordPlaceholder") {
        const value = getNestedValue(data, key);
        if (value && typeof value === "string" && value.match(/^[•]+$/)) {
          if (deleteNestedKey(data, key)) deleted++;
        }
        continue;
      }
      
      if (deleteNestedKey(data, key)) {
        deleted++;
      }
    }
    
    if (deleted > 0) {
      writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
      return { deleted, error: null };
    }
    
    return { deleted: 0, error: null };
  } catch (err) {
    return { deleted: 0, error: err.message };
  }
}

/**
 * Process all locale files in a directory
 */
function processDirectory(dirName, dirPath) {
  console.log(`\n📁 Processing ${dirName}...`);
  console.log("─".repeat(60));
  
  const results = [];
  const files = readdirSync(dirPath).filter((f) => f.endsWith(".json"));
  
  for (const file of files) {
    const langCode = file.replace(".json", "");
    const filePath = join(dirPath, file);
    
    const result = processLocaleFile(filePath, langCode);
    
    if (result.error) {
      console.log(`  ❌ ${langCode}.json - Error: ${result.error}`);
      results.push({ langCode, deleted: 0, error: result.error });
      continue;
    }
    
    if (result.deleted > 0) {
      console.log(`  ✓ ${langCode}.json - Deleted ${result.deleted} key(s)`);
      results.push({ langCode, deleted: result.deleted });
    } else {
      console.log(`  ○ ${langCode}.json - No keys to delete`);
      results.push({ langCode, deleted: 0 });
    }
  }
  
  return results;
}

/**
 * Main function
 */
function main() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║   Delete Placeholder Keys from Translations       ║");
  console.log("╚════════════════════════════════════════════════════╝\n");
  
  console.log("Keys to delete:");
  KEYS_TO_DELETE.forEach(key => console.log(`  - ${key}`));
  
  const allResults = [];
  
  for (const dir of TRANSLATION_DIRS) {
    const results = processDirectory(dir.name, dir.path);
    allResults.push({ name: dir.name, results });
  }
  
  // Summary
  console.log(`\n${"═".repeat(60)}`);
  console.log("SUMMARY\n");
  
  let totalDeleted = 0;
  for (const dir of allResults) {
    const dirTotal = dir.results.reduce((sum, r) => sum + r.deleted, 0);
    totalDeleted += dirTotal;
    console.log(`${dir.name}: ${dirTotal} key(s) deleted`);
  }
  
  console.log(`\nTotal: ${totalDeleted} key(s) deleted`);
  console.log("\n✨ Done!\n");
}

main();

