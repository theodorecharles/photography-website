#!/usr/bin/env node

/**
 * Auto-translate backend locale files
 * Finds [EN] placeholders and translates them using OpenAI
 */

import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync, existsSync } from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env") });

const LOCALES_DIR = join(__dirname, "../backend/src/i18n/locales");
const CONFIG_PATH = join(__dirname, "../data/config.json");

// Language configurations
const LANGUAGES = [
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "nl", name: "Dutch" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "ko", name: "Korean" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "sv", name: "Swedish" },
  { code: "no", name: "Norwegian" },
  { code: "ro", name: "Romanian" },
  { code: "tl", name: "Filipino/Tagalog" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
];

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Get OpenAI API key from config or environment
 */
function getOpenAIKey() {
  // Try config file first
  if (existsSync(CONFIG_PATH)) {
    try {
      const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
      if (config.openAI?.apiKey) {
        return config.openAI.apiKey;
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
 * Find all [EN] placeholders in a nested object
 */
function findPlaceholders(obj, path = []) {
  const placeholders = [];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = [...path, key];

    if (typeof value === "string" && value.startsWith("[EN] ")) {
      placeholders.push({
        key: currentPath.join("."),
        text: value.substring(5), // Remove [EN] prefix
        path: currentPath,
      });
    } else if (typeof value === "object" && value !== null) {
      placeholders.push(...findPlaceholders(value, currentPath));
    }
  }

  return placeholders;
}

/**
 * Set a value in a nested object using a path array
 */
function setNestedValue(obj, path, value) {
  const lastKey = path[path.length - 1];
  const parent = path.slice(0, -1).reduce((acc, key) => acc[key], obj);
  parent[lastKey] = value;
}

/**
 * Translate placeholders for a single language
 */
async function translateLanguage(openai, langCode, langName) {
  log(`\n🌍 Translating ${langName} (${langCode})...`, colors.cyan);

  const filePath = join(LOCALES_DIR, `${langCode}.json`);
  if (!existsSync(filePath)) {
    log(`  ✗ File not found: ${filePath}`, colors.red);
    return;
  }

  // Read current translations
  const content = JSON.parse(readFileSync(filePath, "utf8"));
  const placeholders = findPlaceholders(content);

  if (placeholders.length === 0) {
    log(`  ✓ No placeholders to translate`, colors.green);
    return;
  }

  log(
    `  Found ${placeholders.length} placeholder${placeholders.length > 1 ? "s" : ""} to translate`,
    colors.dim
  );

  // Prepare translation prompt
  const textsToTranslate = placeholders.map(
    (p, i) => `${i + 1}. ${p.text}`
  );

  const prompt = `Translate the following English text to ${langName}. Preserve any HTML tags, variables in {{curly braces}}, and formatting exactly as they appear. Return ONLY the translated text, one per line, numbered:

${textsToTranslate.join("\n")}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const translatedText = response.choices[0].message.content.trim();
    const translations = translatedText
      .split("\n")
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .filter((line) => line.length > 0);

    if (translations.length !== placeholders.length) {
      log(
        `  ⚠ Warning: Expected ${placeholders.length} translations but got ${translations.length}`,
        colors.yellow
      );
    }

    // Apply translations
    for (let i = 0; i < Math.min(translations.length, placeholders.length); i++) {
      setNestedValue(content, placeholders[i].path, translations[i]);
    }

    // Write back to file
    writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n", "utf8");
    log(`  ✓ Translated ${translations.length} string${translations.length > 1 ? "s" : ""}`, colors.green);
  } catch (err) {
    log(`  ✗ Translation failed: ${err.message}`, colors.red);
  }
}

/**
 * Main function
 */
async function main() {
  log("\n" + colors.cyan);
  log("╔════════════════════════════════════════════════════╗");
  log("║     Auto-Translate Backend Tool                    ║");
  log("╚════════════════════════════════════════════════════╝");
  log(colors.reset);

  try {
    const apiKey = getOpenAIKey();
    const openai = new OpenAI({ apiKey });

    for (const lang of LANGUAGES) {
      await translateLanguage(openai, lang.code, lang.name);
    }

    log("\n✨ Translation complete!\n", colors.green);
  } catch (err) {
    log(`\n✗ Error: ${err.message}\n`, colors.red);
    process.exit(1);
  }
}

main();
