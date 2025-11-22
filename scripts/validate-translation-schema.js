#!/usr/bin/env node

/**
 * Translation Schema Validator
 *
 * Validates that all translation files have the same schema as en.json
 * Checks for missing keys, extra keys, and structural differences
 * Works with BOTH frontend and backend translation files
 */

import { readFileSync, readdirSync } from "fs";
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
  blue: "\x1b[36m",
  bold: "\x1b[1m",
};

/**
 * Get all keys from an object (nested)
 * Returns array of dot-notation paths like "metrics.map.loading"
 */
function getAllKeys(obj, prefix = "") {
  const keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      // Recurse into nested objects
      keys.push(...getAllKeys(value, fullKey));
    } else {
      // Leaf node - add the key
      keys.push(fullKey);
    }
  }

  return keys.sort();
}

/**
 * Compare two sets of keys and find differences
 */
function compareKeys(referenceKeys, targetKeys, targetLang) {
  const missing = referenceKeys.filter((key) => !targetKeys.includes(key));
  const extra = targetKeys.filter((key) => !referenceKeys.includes(key));

  return { missing, extra };
}

/**
 * Validate a single translation file against the reference
 */
function validateTranslationFile(referenceKeys, filePath, langCode) {
  try {
    const content = readFileSync(filePath, "utf8");
    const data = JSON.parse(content);
    const keys = getAllKeys(data);

    const { missing, extra } = compareKeys(referenceKeys, keys, langCode);

    return {
      langCode,
      valid: missing.length === 0 && extra.length === 0,
      missing,
      extra,
      totalKeys: keys.length,
    };
  } catch (error) {
    return {
      langCode,
      valid: false,
      error: error.message,
      missing: [],
      extra: [],
      totalKeys: 0,
    };
  }
}

/**
 * Validate all translations in a directory
 */
function validateTranslationDir(dirName, dirPath) {
  console.log(
    `${colors.blue}${colors.bold}${dirName} Translations${colors.reset}`
  );
  console.log(`${colors.blue}${"═".repeat(60)}${colors.reset}\n`);

  // Load reference schema (en.json)
  const referenceFile = join(dirPath, "en.json");
  let referenceData, referenceKeys;

  try {
    referenceData = JSON.parse(readFileSync(referenceFile, "utf8"));
    referenceKeys = getAllKeys(referenceData);
    console.log(
      `${colors.blue}📋 Reference: en.json (${referenceKeys.length} keys)${colors.reset}\n`
    );
  } catch (error) {
    console.error(
      `${colors.red}❌ Error reading reference file (en.json): ${error.message}${colors.reset}\n`
    );
    return { valid: false, validCount: 0, totalCount: 0, invalidFiles: [] };
  }

  // Get all translation files
  const files = readdirSync(dirPath).filter(
    (f) => f.endsWith(".json") && f !== "en.json"
  );

  // Validate each file
  const results = [];
  for (const file of files) {
    const langCode = file.replace(".json", "");
    const filePath = join(dirPath, file);
    const result = validateTranslationFile(referenceKeys, filePath, langCode);
    results.push(result);
  }

  // Display results
  let allValid = true;
  const invalidFiles = [];

  for (const result of results) {
    if (result.error) {
      console.log(
        `${colors.red}❌ ${result.langCode}.json - ERROR: ${result.error}${colors.reset}`
      );
      allValid = false;
      invalidFiles.push(result.langCode);
      continue;
    }

    if (result.valid) {
      console.log(
        `${colors.green}✓ ${result.langCode}.json - OK (${result.totalKeys} keys)${colors.reset}`
      );
    } else {
      console.log(
        `${colors.red}✗ ${result.langCode}.json - INVALID${colors.reset}`
      );
      allValid = false;
      invalidFiles.push(result.langCode);

      if (result.missing.length > 0) {
        console.log(
          `${colors.yellow}  Missing keys (${result.missing.length}):${colors.reset}`
        );
        result.missing.slice(0, 5).forEach((key) => {
          console.log(`${colors.yellow}    - ${key}${colors.reset}`);
        });
        if (result.missing.length > 5) {
          console.log(
            `${colors.yellow}    ... and ${result.missing.length - 5} more${colors.reset}`
          );
        }
      }

      if (result.extra.length > 0) {
        console.log(
          `${colors.yellow}  Extra keys (${result.extra.length}):${colors.reset}`
        );
        result.extra.slice(0, 5).forEach((key) => {
          console.log(`${colors.yellow}    + ${key}${colors.reset}`);
        });
        if (result.extra.length > 5) {
          console.log(
            `${colors.yellow}    ... and ${result.extra.length - 5} more${colors.reset}`
          );
        }
      }

      console.log(); // Empty line for readability
    }
  }

  const validCount = results.filter((r) => r.valid && !r.error).length;
  const totalCount = results.length;

  console.log();

  return { valid: allValid, validCount, totalCount, invalidFiles };
}

/**
 * Main validation function
 */
function validateAllTranslations() {
  console.log(
    `${colors.blue}\n╔════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.blue}║     Translation Schema Validator                 ║${colors.reset}`
  );
  console.log(
    `${colors.blue}╚════════════════════════════════════════════════════╝${colors.reset}\n`
  );

  const allResults = [];

  // Validate each directory
  for (const dir of TRANSLATION_DIRS) {
    const result = validateTranslationDir(dir.name, dir.path);
    allResults.push({ ...result, name: dir.name });
  }

  // Overall summary
  console.log(
    `${colors.blue}${colors.bold}OVERALL SUMMARY${colors.reset}`
  );
  console.log(
    `${colors.blue}${"═".repeat(60)}${colors.reset}\n`
  );

  let overallValid = true;
  for (const result of allResults) {
    const status = result.valid
      ? `${colors.green}✓ VALID${colors.reset}`
      : `${colors.red}✗ INVALID${colors.reset}`;

    console.log(
      `${result.name}: ${status} (${result.validCount}/${result.totalCount} files)`
    );

    if (!result.valid) {
      overallValid = false;
      console.log(
        `${colors.yellow}  Invalid: ${result.invalidFiles.join(", ")}${colors.reset}`
      );
    }
  }

  console.log();

  if (overallValid) {
    const totalFiles = allResults.reduce((sum, r) => sum + r.totalCount, 0);
    console.log(
      `${colors.green}${colors.bold}✓ All ${totalFiles} translation files are valid!${colors.reset}`
    );
    console.log(
      `${colors.green}  All files have the same schema as their respective en.json${colors.reset}\n`
    );
    process.exit(0);
  } else {
    const totalFiles = allResults.reduce((sum, r) => sum + r.totalCount, 0);
    const totalInvalid = allResults.reduce(
      (sum, r) => sum + (r.totalCount - r.validCount),
      0
    );
    console.log(
      `${colors.red}${colors.bold}✗ ${totalInvalid} of ${totalFiles} translation files have schema issues${colors.reset}\n`
    );
    process.exit(1);
  }
}

// Run validation
validateAllTranslations();
