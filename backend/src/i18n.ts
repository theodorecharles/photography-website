/**
 * Backend i18n Configuration
 * Uses i18next with fs backend to load translations from frontend locale files
 */

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { info, error as logError } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Debug: Log the resolved path
const localePath = join(__dirname, '../../frontend/src/i18n/locales/{{lng}}.json');
info(`[i18n] Loading translations from: ${localePath.replace('{{lng}}', 'en')}`);
info(`[i18n] __dirname is: ${__dirname}`);

// Initialize i18next for backend use
const initPromise = i18next
  .use(Backend)
  .init({
    lng: 'en', // default language
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr', 'de', 'ja', 'nl', 'it', 'pt', 'ru', 'zh', 'ko', 'pl', 'tr', 'sv', 'no', 'ro', 'tl', 'vi', 'id'],
    backend: {
      // Load from frontend locale files  
      loadPath: localePath,
    },
    interpolation: {
      escapeValue: false, // HTML will be escaped manually when needed
    },
    preload: ['en', 'es', 'fr', 'de', 'ja', 'nl', 'it', 'pt', 'ru', 'zh', 'ko', 'pl', 'tr', 'sv', 'no', 'ro', 'tl', 'vi', 'id'],
  });

// Wait for initialization and log result
initPromise
  .then(() => {
    // Log what languages are actually available after initialization
    const availableLanguages = i18next.languages || [];
    info(`[i18n] Initialized successfully with ${availableLanguages.length} languages`);
    info(`[i18n] Available languages: ${availableLanguages.join(', ')}`);
    
    // Translation files verified and loaded successfully
  })
  .catch((err) => {
    logError('[i18n] Failed to initialize:', err);
  });

export default i18next;
export { initPromise };
