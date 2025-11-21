#!/usr/bin/env node

/**
 * Interactive Translation Verification
 * 
 * For each "untranslated" string, show it to the user and let them:
 * - Keep it (it's correct as-is, will be whitelisted)
 * - Translate it (force AI translation)
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import OpenAI from "openai";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOCALES_DIR = join(__dirname, "../frontend/src/i18n/locales");
const WHITELIST_FILE = join(__dirname, "language-whitelist.json");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Language names for better UX
const LANGUAGE_NAMES = {
  de: "German",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  nl: "Dutch",
  pt: "Portuguese",
  pl: "Polish",
  ro: "Romanian",
  sv: "Swedish",
  no: "Norwegian",
  tr: "Turkish",
  id: "Indonesian",
  vi: "Vietnamese",
  tl: "Filipino (Tagalog)",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  zh: "Chinese (Simplified)",
};

const UNIVERSAL_WORDS = new Set([
  "galleria", "openai", "google", "openobserve",
  "mfa", "smtp", "oauth", "api", "json", "iso",
]);

function flattenKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
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

function isUniversalWord(str) {
  if (typeof str !== "string") return false;
  const lower = str.toLowerCase().trim();
  
  if (UNIVERSAL_WORDS.has(lower)) return true;
  
  // Template variables
  if (str.match(/{{[^}]+}}/)) return true;
  
  // Dots, emoji, URLs, etc
  if (str.match(/^[•]+$/) || str.match(/^[⚠️💡✓❌🔑📧]/) || str.includes("@") || str.includes("://")) return true;
  
  // Very short
  if (str.length <= 2) return true;
  
  return false;
}

async function translateString(text, targetLang) {
  const prompt = `Translate the following English text to ${LANGUAGE_NAMES[targetLang]}. 
Return ONLY the translation, nothing else. If it's a technical term that should stay the same, return it unchanged.

English: ${text}

${LANGUAGE_NAMES[targetLang]}:`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 100,
  });

  return response.choices[0].message.content.trim();
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║  Interactive Translation Verification             ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  // Load English reference
  const enData = JSON.parse(readFileSync(join(LOCALES_DIR, "en.json"), "utf-8"));
  const enFlat = flattenKeys(enData);
  const enMap = Object.fromEntries(enFlat.map(item => [item.key, item.value]));

  // Track what to keep (whitelist) per language
  const whitelist = {};
  const translations = {};

  const languages = Object.keys(LANGUAGE_NAMES).filter(lang => {
    try {
      readFileSync(join(LOCALES_DIR, `${lang}.json`), "utf-8");
      return true;
    } catch {
      return false;
    }
  });

  for (const lang of languages) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`🌍 ${LANGUAGE_NAMES[lang].toUpperCase()} (${lang})`);
    console.log("=".repeat(70));

    const langData = JSON.parse(readFileSync(join(LOCALES_DIR, `${lang}.json`), "utf-8"));
    const langFlat = flattenKeys(langData);
    const langMap = Object.fromEntries(langFlat.map(item => [item.key, item.value]));

    whitelist[lang] = [];
    translations[lang] = [];

    // Find untranslated keys
    const untranslated = [];
    for (const [key, enValue] of Object.entries(enMap)) {
      if (typeof enValue !== "string" || enValue === "") continue;
      if (isUniversalWord(enValue)) continue;
      
      const langValue = langMap[key];
      if (langValue === enValue) {
        untranslated.push({ key, value: enValue });
      }
    }

    if (untranslated.length === 0) {
      console.log("✅ No untranslated strings found!\n");
      continue;
    }

    console.log(`\nFound ${untranslated.length} string(s) matching English.\n`);

    for (let i = 0; i < untranslated.length; i++) {
      const { key, value } = untranslated[i];
      
      console.log(`\n[${i + 1}/${untranslated.length}] Key: ${key}`);
      console.log(`English: "${value}"`);
      
      const answer = await askQuestion("\nOptions: (k)eep as-is, (t)ranslate, (s)kip: ");
      
      if (answer === "k" || answer === "keep") {
        console.log(`✓ Keeping "${value}" (will be whitelisted)`);
        whitelist[lang].push(value);
      } else if (answer === "t" || answer === "translate") {
        console.log("🔄 Translating...");
        try {
          const translated = await translateString(value, lang);
          console.log(`   Suggested translation: "${translated}"`);
          
          const confirm = await askQuestion("   Accept? (y/n): ");
          if (confirm === "y" || confirm === "yes") {
            translations[lang].push({ key, original: value, translated });
            console.log("✓ Translation accepted");
          } else {
            console.log("✗ Translation rejected, keeping original");
            whitelist[lang].push(value);
          }
        } catch (error) {
          console.log(`✗ Translation failed: ${error.message}`);
          whitelist[lang].push(value);
        }
      } else {
        console.log("⊘ Skipped");
      }
    }
  }

  // Save whitelist
  console.log("\n\n" + "=".repeat(70));
  console.log("SAVING RESULTS");
  console.log("=".repeat(70));

  writeFileSync(WHITELIST_FILE, JSON.stringify(whitelist, null, 2), "utf-8");
  console.log(`\n✓ Whitelist saved to: ${WHITELIST_FILE}`);

  // Apply translations
  let totalTranslations = 0;
  for (const [lang, items] of Object.entries(translations)) {
    if (items.length === 0) continue;
    
    const langPath = join(LOCALES_DIR, `${lang}.json`);
    const langData = JSON.parse(readFileSync(langPath, "utf-8"));
    
    for (const { key, translated } of items) {
      setNestedValue(langData, key, translated);
      totalTranslations++;
    }
    
    writeFileSync(langPath, JSON.stringify(langData, null, 2) + "\n", "utf-8");
    console.log(`✓ Applied ${items.length} translation(s) to ${lang}.json`);
  }

  console.log(`\n✅ Complete! Applied ${totalTranslations} translation(s) total.`);
  console.log("\nNext steps:");
  console.log("1. Review the whitelist in: scripts/language-whitelist.json");
  console.log("2. Run: node scripts/validate-translations.js");
  console.log("3. If needed, update the validator with language-specific whitelists\n");
}

main().catch(console.error);


