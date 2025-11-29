#!/usr/bin/env node

/**
 * Auto-Translate Script
 *
 * Uses OpenAI GPT-4 to translate all [EN] placeholders to target languages
 * Works with BOTH frontend and backend translation files
 */

import OpenAI from "openai";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file if it exists
const envPath = join(__dirname, "../.env");
if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

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

const CONFIG_PATH = join(__dirname, "../data/config.json");

// Language configurations
const languages = {
  es: "Spanish",
  fr: "French",
  de: "German",
  ja: "Japanese",
  nl: "Dutch",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  zh: "Chinese (Simplified)",
  ko: "Korean",
  pl: "Polish",
  tr: "Turkish",
  sv: "Swedish",
  no: "Norwegian",
  ro: "Romanian",
  tl: "Filipino (Tagalog)",
  vi: "Vietnamese",
  id: "Indonesian",
  el: "Greek",
  hu: "Hungarian",
  cs: "Czech",
  uk: "Ukrainian",
  ca: "Catalan",
  bg: "Bulgarian",
  hr: "Croatian",
  da: "Danish",
  fi: "Finnish",
  sk: "Slovak",
  lt: "Lithuanian",
  sl: "Slovenian",
  sr: "Serbian",
  eu: "Basque",
  la: "Latin",
  ms: "Malay",
  th: "Thai",
  my: "Burmese",
};

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Get all values with [EN] prefix from nested object
 */
function findEnPlaceholders(obj, prefix = "") {
  const placeholders = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      placeholders.push(...findEnPlaceholders(value, fullKey));
    } else if (typeof value === "string" && value.startsWith("[EN] ")) {
      const englishText = value.substring(5); // Remove '[EN] ' prefix
      placeholders.push({ key: fullKey, text: englishText });
    }
  }
  return placeholders;
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
 * Get OpenAI API key from config or environment
 */
function getOpenAIKey() {
  // Try config file first
  if (existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
      if (config.openai?.apiKey) {
        return config.openai.apiKey;
      }
    } catch (err) {
      // Config file exists but couldn't be parsed, fall through to env var
    }
  }

  // Fall back to environment variable
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  throw new Error(
    "No OpenAI API key found. Add it to data/config.json or set OPENAI_API_KEY environment variable."
  );
}

/**
 * Check if the response is an apology or refusal from OpenAI
 */
function isApologyResponse(text) {
  const lowerText = text.toLowerCase();
  const apologyPatterns = [
    "sorry",
    "i can't",
    "i cannot",
    "i'm not able to",
    "i am not able to",
    "i don't have",
    "i do not have",
    "as an ai",
    "i apologize",
    "i'm unable",
    "i am unable",
  ];

  return apologyPatterns.some(pattern => lowerText.includes(pattern));
}

/**
 * Translate placeholders for a language with retry logic
 */
async function translateLanguage(openai, langCode, langName, filePath) {
  try {
    const content = readFileSync(filePath, "utf8");
    const data = JSON.parse(content);

    const placeholders = findEnPlaceholders(data);

    if (placeholders.length === 0) {
      log(`  ✓ No placeholders to translate`, "green");
      return { success: true, translated: 0 };
    }

    log(`  Found ${placeholders.length} placeholder(s) to translate`);

    // Batch translate (max 50 at a time to avoid token limits)
    const batchSize = 50;
    let totalTranslated = 0;
    const failedTranslations = [];

    for (let i = 0; i < placeholders.length; i += batchSize) {
      const batch = placeholders.slice(i, i + batchSize);

      // Create numbered list for translation
      const textList = batch.map((p, idx) => `${idx + 1}. ${p.text}`).join("\n");

      const prompt = `Translate the following English text to ${langName}. Preserve any HTML tags, variables in {{curly braces}}, and formatting exactly as they appear. Return ONLY the translated text, one per line, numbered:

${textList}`;

      let translatedText = null;
      let retryCount = 0;
      const maxRetries = 3;

      // Retry loop for handling apology responses
      while (retryCount < maxRetries) {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          });

          const responseText = response.choices[0].message.content.trim();

          // Check if response is an apology
          if (isApologyResponse(responseText)) {
            retryCount++;
            log(`  ⚠️  OpenAI returned an apology response (attempt ${retryCount}/${maxRetries})`, "yellow");
            log(`     Response: ${responseText.substring(0, 100)}...`, "yellow");

            if (retryCount < maxRetries) {
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              continue;
            } else {
              // Max retries reached, log the failure
              log(`  ✗ Failed after ${maxRetries} attempts - OpenAI refused to translate`, "red");
              failedTranslations.push({
                batch: batch.map(b => b.key),
                reason: "OpenAI refusal",
                response: responseText.substring(0, 200)
              });
              break;
            }
          }

          // Success - valid translation received
          translatedText = responseText;
          break;

        } catch (apiError) {
          retryCount++;
          log(`  ⚠️  API error (attempt ${retryCount}/${maxRetries}): ${apiError.message}`, "yellow");

          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          } else {
            throw apiError;
          }
        }
      }

      // Process translations if we got a valid response
      if (translatedText) {
        const translations = translatedText
          .split("\n")
          .map((line) => line.replace(/^\d+\.\s*/, "").trim())
          .filter((line) => line.length > 0);

        // Apply translations
        for (let j = 0; j < Math.min(translations.length, batch.length); j++) {
          setNestedValue(data, batch[j].key, translations[j]);
          totalTranslated++;
        }
      }
    }

    // Write back to file
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");

    // Report results
    if (failedTranslations.length > 0) {
      log(`  ⚠️  Translated ${totalTranslated} string(s), ${failedTranslations.length} batch(es) failed`, "yellow");
      failedTranslations.forEach(failure => {
        log(`     Failed keys: ${failure.batch.join(", ")}`, "yellow");
        log(`     Reason: ${failure.reason}`, "yellow");
      });
      return {
        success: false,
        translated: totalTranslated,
        failed: failedTranslations.length,
        failedDetails: failedTranslations
      };
    } else {
      log(`  ✓ Translated ${totalTranslated} string(s)`, "green");
      return { success: true, translated: totalTranslated };
    }
  } catch (err) {
    log(`  ✗ Translation failed: ${err.message}`, "red");
    return { success: false, translated: 0, error: err.message };
  }
}

/**
 * Translate all files in a directory
 */
async function translateDirectory(openai, dirName, dirPath) {
  log(`\n${colors.cyan}${colors.bold}${dirName} Translations${colors.reset}`);
  log(`${colors.cyan}${"═".repeat(60)}${colors.reset}\n`);

  const results = [];

  for (const [langCode, langName] of Object.entries(languages)) {
    log(`\n🌍 Translating ${langName} (${langCode})...`, "cyan");

    const filePath = join(dirPath, `${langCode}.json`);
    if (!existsSync(filePath)) {
      log(`  ✗ File not found: ${langCode}.json`, "yellow");
      continue;
    }

    const result = await translateLanguage(
      openai,
      langCode,
      langName,
      filePath
    );
    results.push({ langCode, langName, ...result });
  }

  return results;
}

/**
 * Main function
 */
async function main() {
  log("\n" + colors.cyan);
  log("╔════════════════════════════════════════════════════╗");
  log("║     Auto-Translate Tool (Frontend + Backend)      ║");
  log("╚════════════════════════════════════════════════════╝");
  log(colors.reset);

  try {
    const apiKey = getOpenAIKey();
    const openai = new OpenAI({ apiKey });

    const allResults = [];

    // Translate each directory
    for (const dir of TRANSLATION_DIRS) {
      const results = await translateDirectory(openai, dir.name, dir.path);
      allResults.push({ name: dir.name, results });
    }

    // Summary
    log(`\n${colors.cyan}${colors.bold}SUMMARY${colors.reset}`);
    log(`${colors.cyan}${"═".repeat(60)}${colors.reset}\n`);

    let hasFailures = false;
    const failureDetails = [];

    for (const dir of allResults) {
      const successful = dir.results.filter((r) => r.success).length;
      const totalTranslated = dir.results.reduce(
        (sum, r) => sum + r.translated,
        0
      );
      const totalFailed = dir.results.reduce(
        (sum, r) => sum + (r.failed || 0),
        0
      );

      log(
        `${dir.name}: ${successful}/${dir.results.length} languages, ${totalTranslated} strings translated`,
        totalTranslated > 0 ? "green" : "yellow"
      );

      if (totalFailed > 0) {
        hasFailures = true;
        log(`  ⚠️  ${totalFailed} batch(es) failed due to OpenAI refusals`, "yellow");

        // Collect failure details
        dir.results.forEach(result => {
          if (result.failedDetails && result.failedDetails.length > 0) {
            failureDetails.push({
              language: result.langName,
              details: result.failedDetails
            });
          }
        });
      }
    }

    if (hasFailures) {
      log(`\n${colors.yellow}${colors.bold}FAILED TRANSLATIONS${colors.reset}`);
      log(`${colors.yellow}${"═".repeat(60)}${colors.reset}\n`);

      failureDetails.forEach(({ language, details }) => {
        log(`Language: ${language}`, "yellow");
        details.forEach((failure, idx) => {
          log(`  Batch ${idx + 1}:`, "yellow");
          log(`    Keys: ${failure.batch.join(", ")}`, "yellow");
          log(`    OpenAI response: "${failure.response}"`, "yellow");
        });
        console.log();
      });

      log(`💡 Tip: The failed translations still have [EN] prefix. You can:`, "cyan");
      log(`   1. Try running the script again`, "cyan");
      log(`   2. Use interactive-translate.js to manually translate them`, "cyan");
      log(`   3. Check if the content triggered OpenAI's content policy\n`, "cyan");
    }

    log(hasFailures ? "\n⚠️  Translation complete with some failures\n" : "\n✨ Translation complete!\n", hasFailures ? "yellow" : "green");
  } catch (err) {
    log(`\n✗ Error: ${err.message}\n`, "red");
    process.exit(1);
  }
}

main();
