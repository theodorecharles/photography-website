/**
 * Backend i18n helper for translating notifications
 * Uses the same translations as frontend, loaded from JSON files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { error as logError } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load all translation files (backend-only translations)
const translationsCache: { [locale: string]: any } = {};
const localesDir = path.join(__dirname, 'i18n/locales');

// Supported languages
const supportedLocales = [
  'en', 'es', 'fr', 'de', 'ja', 'nl', 'it', 'pt', 'ru', 'zh',
  'ko', 'pl', 'tr', 'sv', 'no', 'ro', 'tl', 'vi', 'id'
];

// Load translations on module initialization
function loadTranslations() {
  supportedLocales.forEach(locale => {
    try {
      const filePath = path.join(localesDir, `${locale}.json`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        translationsCache[locale] = JSON.parse(content);
      }
    } catch (err) {
      logError(`[i18n] Failed to load ${locale} translations:`, err);
    }
  });
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
 * Get user's preferred locale from database
 * Returns 'en' as default if not set
 */
export async function getUserLocale(userId: number): Promise<string> {
  try {
    const { getDatabase } = await import('./database.js');
    const db = getDatabase();
    
    const user = db.prepare('SELECT locale FROM users WHERE id = ?').get(userId) as { locale?: string } | undefined;
    
    return user?.locale || 'en';
  } catch (err) {
    logError('[i18n] Failed to get user locale:', err);
    return 'en';
  }
}

/**
 * Translate notification for a specific user
 * Automatically fetches user's locale from database
 */
export async function translateNotificationForUser(userId: number, key: string): Promise<string> {
  const locale = await getUserLocale(userId);
  return translateBackend(key, locale);
}

