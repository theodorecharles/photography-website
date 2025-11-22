/**
 * Backend i18n helper for translating notifications
 * Uses the same translations as frontend, loaded from JSON files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { error as logError, info } from './utils/logger.js';
import { getCurrentConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load all translation files (backend-only translations)
const translationsCache: { [locale: string]: any } = {};
// Resolve path relative to this file's location (works in both src and dist)
const localesDir = path.join(__dirname, 'i18n/locales');

// Supported languages
const supportedLocales = [
  'en', 'es', 'fr', 'de', 'ja', 'nl', 'it', 'pt', 'ru', 'zh',
  'ko', 'pl', 'tr', 'sv', 'no', 'ro', 'tl', 'vi', 'id'
];

// Load translations on module initialization
function loadTranslations() {
  let successCount = 0;
  let failCount = 0;
  
  supportedLocales.forEach(locale => {
    try {
      const filePath = path.join(localesDir, `${locale}.json`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        translationsCache[locale] = JSON.parse(content);
        successCount++;
      } else {
        failCount++;
        logError(`[i18n] File not found: ${filePath}`);
      }
    } catch (err) {
      failCount++;
      logError(`[i18n] Failed to load ${locale} translations:`, err);
    }
  });
  
  info(`[i18n-backend] Loaded ${successCount}/${supportedLocales.length} translation files from ${localesDir}`);
  if (failCount > 0) {
    logError(`[i18n-backend] Failed to load ${failCount} translation files`);
  }
}

loadTranslations();

/**
 * Get nested object property by path
 * e.g. getNestedProperty(obj, 'notifications.backend.testNotificationTitle')
 */
function getNestedProperty(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Translate a key for a specific locale
 * Falls back to English if translation not found
 */
export function translateBackend(key: string, locale: string = 'en'): string {
  // Ensure locale is supported, default to 'en'
  if (!supportedLocales.includes(locale)) {
    locale = 'en';
  }

  // Try to get translation for requested locale
  let translation = getNestedProperty(translationsCache[locale], key);
  
  // Fall back to English if not found
  if (!translation && locale !== 'en') {
    translation = getNestedProperty(translationsCache['en'], key);
  }

  // Return translation or key if not found
  return translation || key;
}

/**
 * Get global locale from config.json
 * Returns 'en' as default if not set
 */
export function getGlobalLocale(): string {
  try {
    const config = getCurrentConfig();
    const locale = config?.branding?.language || 'en';
    return locale;
  } catch (err) {
    logError('[i18n-backend] Failed to get global locale from config:', err);
    return 'en';
  }
}

/**
 * Translate notification using global language setting with variable interpolation
 * Reads language from data/config.json
 * @param userId - User ID (not used currently, kept for compatibility)
 * @param key - Translation key
 * @param variables - Optional variables for interpolation (e.g., {userName: 'John'})
 */
export async function translateNotificationForUser(userId: number, key: string, variables?: Record<string, any>): Promise<string> {
  const locale = getGlobalLocale();
  let translated = translateBackend(key, locale);
  
  // Interpolate variables if provided
  if (variables) {
    Object.entries(variables).forEach(([varName, value]) => {
      translated = translated.replace(new RegExp(`{{${varName}}}`, 'g'), String(value));
    });
  }
  
  return translated;
}

