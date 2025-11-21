#!/usr/bin/env node

/**
 * Auto-Translate Script
 *
 * Uses OpenAI GPT-4 to translate all [EN] placeholders to target languages
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

const LOCALES_DIR = join(__dirname, "../frontend/src/i18n/locales");
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
};

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
 * Translate a single string using OpenAI
 */
async function translateSingle(openai, text, targetLanguage) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional translator specializing in software UI translations. Translate the UI string to ${targetLanguage}. Important rules:
1. Preserve {{variables}} exactly as they appear (e.g., {{count}}, {{email}}, {{albumName}})
2. Preserve HTML tags like <strong></strong>
3. Preserve special characters and emojis (✓, ❌, 🔒, etc.)
4. Keep the tone appropriate for UI elements
5. DO NOT translate brand names and technical acronyms: Google, OpenObserve, OpenAI, Galleria, MFA, SMTP
6. DO translate common UI terms like "Modal" (referring to a popup dialog) - translate it appropriately for ${targetLanguage}
7. Return ONLY the translation, no quotes, explanations, or extra text`,
      },
      {
        role: "user",
        content: text,
      },
    ],
    temperature: 0.3,
    max_tokens: 200,
  });

  const translation = response.choices[0]?.message?.content?.trim();

  if (!translation) {
    throw new Error(`Empty translation received`);
  }

  return translation;
}

/**
 * Translate a batch of strings using OpenAI
 */
async function translateBatch(openai, batch, targetLanguage) {
  const texts = batch.map((item) => item.text);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional translator specializing in software UI translations. Translate the following UI strings to ${targetLanguage}. Important rules:
1. Preserve {{variables}} exactly as they appear (e.g., {{count}}, {{email}}, {{albumName}})
2. Preserve HTML tags like <strong></strong>
3. Preserve special characters and emojis (✓, ❌, 🔒, etc.)
4. Keep the tone appropriate for UI elements
5. DO NOT translate brand names and technical acronyms: Google, OpenObserve, OpenAI, Galleria, MFA, SMTP
6. DO translate common UI terms like "Modal" (referring to a popup dialog) - translate it appropriately for ${targetLanguage}
7. Return ONLY the translations, one per line, in the same order as the input
8. Do not add quotes, explanations, or extra text`,
        },
        {
          role: "user",
          content: texts.join("\n"),
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const translations = response.choices[0]?.message?.content
      ?.trim()
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    if (!translations || translations.length !== texts.length) {
      // If batch translation fails, try one at a time
      log(
        `  Batch mismatch (expected ${texts.length}, got ${translations?.length}), trying one-by-one...`,
        "yellow"
      );
      const oneByOne = [];
      for (const text of texts) {
        const translation = await translateSingle(openai, text, targetLanguage);
        oneByOne.push(translation.trim());
        await new Promise((resolve) => setTimeout(resolve, 300)); // Small delay
      }
      return oneByOne;
    }

    return translations;
  } catch (error) {
    console.error(`Translation error:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  log("\n╔════════════════════════════════════════════════════╗", "cyan");
  log("║     Auto-Translate Tool                          ║", "cyan");
  log("╚════════════════════════════════════════════════════╝\n", "cyan");

  // Load OpenAI API key from .env or config.json
  let apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    // Fall back to config.json
    if (existsSync(CONFIG_PATH)) {
      const configData = readFileSync(CONFIG_PATH, "utf8");
      const config = JSON.parse(configData);
      apiKey = config.openai?.apiKey;
    }
  }

  if (!apiKey || apiKey.trim() === "") {
    log("ERROR: OpenAI API key not configured", "yellow");
    log(
      "Please set OPENAI_API_KEY in .env or configure it in data/config.json",
      "yellow"
    );
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  let totalTranslated = 0;
  const batchSize = 10; // Translate 10 strings at a time

  // Process each language
  for (const [langCode, langName] of Object.entries(languages)) {
    log(`\n🌍 Translating ${langName} (${langCode})...`, "cyan");

    const filePath = join(LOCALES_DIR, `${langCode}.json`);
    const data = JSON.parse(readFileSync(filePath, "utf-8"));

    // Find all [EN] placeholders
    const placeholders = findEnPlaceholders(data);

    if (placeholders.length === 0) {
      log(`  ✓ No placeholders to translate`, "green");
      continue;
    }

    log(`  Found ${placeholders.length} placeholders to translate`, "yellow");

    // Process in batches
    for (let i = 0; i < placeholders.length; i += batchSize) {
      const batch = placeholders.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(placeholders.length / batchSize);

      log(
        `  Batch ${batchNum}/${totalBatches} (${batch.length} strings)...`,
        "yellow"
      );

      try {
        const translations = await translateBatch(openai, batch, langName);

        // Update the data object
        for (let j = 0; j < batch.length; j++) {
          setNestedValue(data, batch[j].key, translations[j].trim());
          totalTranslated++;
        }

        log(`  ✓ Batch ${batchNum} complete`, "green");

        // Small delay to avoid rate limits
        if (i + batchSize < placeholders.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        log(`  ✗ Batch ${batchNum} failed: ${error.message}`, "yellow");
        log(`  Skipping this batch...`, "yellow");
      }
    }

    // Save the updated file
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    log(`  ✓ Saved ${langCode}.json`, "green");
  }

  log("\n" + "═".repeat(60), "cyan");
  log("COMPLETE", "cyan");
  log("═".repeat(60) + "\n", "cyan");
  log(`Total translations: ${totalTranslated}`, "bold");
  log("\n💡 Run `node scripts/validate-translations.js` to verify.", "cyan");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
