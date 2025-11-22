#!/usr/bin/env node

/**
 * Find Unused Translation Keys
 *
 * Checks every translation key in en.json files to see if it's referenced
 * anywhere in the codebase. Reports keys that are not found.
 * Works with BOTH frontend and backend translation files.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TRANSLATION_DIRS = [
  {
    name: "Frontend",
    path: join(__dirname, "../frontend/src/i18n/locales"),
    codePaths: [
      join(__dirname, "../frontend/src"),
      join(__dirname, "../backend/src"), // Backend also uses frontend translations
    ],
  },
  {
    name: "Backend",
    path: join(__dirname, "../backend/src/i18n/locales"),
    codePaths: [join(__dirname, "../backend/src")],
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
 * Recursively get all code files in a directory
 */
function getAllCodeFiles(dirPath, fileList = []) {
  const files = readdirSync(dirPath);

  for (const file of files) {
    const filePath = join(dirPath, file);
    try {
      const stat = statSync(filePath);
      if (stat.isDirectory()) {
        // Skip node_modules and other common directories
        if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
          getAllCodeFiles(filePath, fileList);
        }
      } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
        fileList.push(filePath);
      }
    } catch (error) {
      // Skip files we can't read
      continue;
    }
  }

  return fileList;
}

/**
 * Search for a translation key in file content
 * Checks multiple patterns:
 * - t('key') or t("key")
 * - t(`key`) (template literal)
 */
function searchInFileContent(content, key) {
  // Escape special regex characters in the key
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Patterns to search for
  const patterns = [
    // Direct usage: t('key') or t("key")
    new RegExp(`t\\(['"]${escapedKey}['"]\\)`),
    // Template literal usage: t(`key`)
    new RegExp(`t\\(\`${escapedKey}\`\\)`),
    // Also check for the key in quotes (might be used in other contexts)
    // But be more careful - only match if it looks like a translation key usage
    new RegExp(`['"]${escapedKey}['"]`),
  ];

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      return true;
    }
  }

  return false;
}


/**
 * Get all code files and their contents (cached)
 */
let fileContentsCache = null;
let codePathsCache = null;

function getFileContents(codePaths) {
  // Return cached contents if paths haven't changed
  if (fileContentsCache && JSON.stringify(codePaths) === JSON.stringify(codePathsCache)) {
    return fileContentsCache;
  }

  const contents = [];
  for (const codePath of codePaths) {
    try {
      const files = getAllCodeFiles(codePath);
      for (const filePath of files) {
        try {
          const content = readFileSync(filePath, "utf8");
          contents.push(content);
        } catch (error) {
          // Skip files we can't read
          continue;
        }
      }
    } catch (error) {
      // Skip paths that don't exist
      continue;
    }
  }

  fileContentsCache = contents;
  codePathsCache = [...codePaths];
  return contents;
}

/**
 * Check if a key is used in the codebase
 */
function checkKeyUsage(key, codePaths) {
  const fileContents = getFileContents(codePaths);
  
  // Search in each file's content
  for (const content of fileContents) {
    if (searchInFileContent(content, key)) {
      return true;
    }
  }

  return false;
}

/**
 * Analyze translation keys for a directory
 */
function analyzeTranslations(dirName, dirPath, codePaths) {
  // Clear cache for new directory
  fileContentsCache = null;
  codePathsCache = null;

  const enJsonPath = join(dirPath, "en.json");

  console.log(`\n${colors.bold}${colors.blue}${dirName} Translations${colors.reset}`);
  console.log(`Reading keys from: ${enJsonPath}`);

  try {
    const content = readFileSync(enJsonPath, "utf8");
    const data = JSON.parse(content);
    const allKeys = getAllKeys(data);

    console.log(`Found ${allKeys.length} translation key(s)`);
    console.log(`Searching in: ${codePaths.join(", ")}`);
    console.log(`\n${colors.yellow}Checking key usage...${colors.reset}`);
    
    // Pre-load file contents to show progress
    console.log(`  Loading code files...`);
    const fileContents = getFileContents(codePaths);
    console.log(`  Loaded ${fileContents.length} file(s)`);

    const unusedKeys = [];
    const usedKeys = [];

    // Check each key
    for (let i = 0; i < allKeys.length; i++) {
      const key = allKeys[i];
      const isUsed = checkKeyUsage(key, codePaths);

      if (isUsed) {
        usedKeys.push(key);
      } else {
        unusedKeys.push(key);
      }

      // Progress indicator
      if ((i + 1) % 50 === 0 || i === allKeys.length - 1) {
        process.stdout.write(
          `\r  Progress: ${i + 1}/${allKeys.length} keys checked...`
        );
      }
    }

    console.log(`\n`);

    // Report results
    console.log(`${colors.green}✓ Used keys: ${usedKeys.length}${colors.reset}`);
    if (unusedKeys.length > 0) {
      console.log(`${colors.red}✗ Unused keys: ${unusedKeys.length}${colors.reset}`);
      console.log(`\n${colors.yellow}Unused translation keys:${colors.reset}`);
      unusedKeys.forEach((key) => {
        console.log(`  - ${key}`);
      });
    } else {
      console.log(`${colors.green}✓ All keys are in use!${colors.reset}`);
    }

    return {
      total: allKeys.length,
      used: usedKeys.length,
      unused: unusedKeys.length,
      unusedKeys,
    };
  } catch (error) {
    console.error(`${colors.red}Error reading ${enJsonPath}: ${error.message}${colors.reset}`);
    return {
      total: 0,
      used: 0,
      unused: 0,
      unusedKeys: [],
      error: error.message,
    };
  }
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.bold}Translation Key Usage Checker${colors.reset}`);
  console.log(`==========================================\n`);

  const results = [];

  for (const dir of TRANSLATION_DIRS) {
    const result = analyzeTranslations(dir.name, dir.path, dir.codePaths);
    results.push({ ...result, name: dir.name });
  }

  // Summary
  console.log(`\n${colors.bold}${colors.blue}SUMMARY${colors.reset}`);
  console.log(`==========================================`);

  let totalKeys = 0;
  let totalUsed = 0;
  let totalUnused = 0;

  for (const result of results) {
    if (result.error) {
      console.log(`${result.name}: ${colors.red}Error - ${result.error}${colors.reset}`);
      continue;
    }

    totalKeys += result.total;
    totalUsed += result.used;
    totalUnused += result.unused;

    const unusedPercent = result.total > 0
      ? ((result.unused / result.total) * 100).toFixed(1)
      : 0;

    console.log(
      `${result.name}: ${result.total} total, ${colors.green}${result.used} used${colors.reset}, ${result.unused > 0 ? colors.red : colors.green}${result.unused} unused${colors.reset} (${unusedPercent}%)`
    );
  }

  console.log(`\n${colors.bold}Overall:${colors.reset}`);
  console.log(`  Total keys: ${totalKeys}`);
  console.log(`  Used: ${colors.green}${totalUsed}${colors.reset}`);
  console.log(`  Unused: ${totalUnused > 0 ? colors.red : colors.green}${totalUnused}${colors.reset}`);

  const overallPercent = totalKeys > 0
    ? ((totalUnused / totalKeys) * 100).toFixed(1)
    : 0;
  console.log(`  Unused percentage: ${overallPercent}%`);

  // Exit with error code if unused keys found
  if (totalUnused > 0) {
    process.exit(1);
  }
}

main();
