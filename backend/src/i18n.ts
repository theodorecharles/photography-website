/**
 * Backend i18n Configuration
 * Uses i18next with fs backend to load translations from frontend locale files
 */

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize i18next for backend use
i18next
  .use(Backend)
  .init({
    lng: 'en', // default language
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr', 'de', 'ja', 'nl', 'it', 'pt', 'ru', 'zh', 'ko', 'pl', 'tr', 'sv', 'no', 'ro', 'tl', 'vi', 'id'],
    backend: {
      // Load from frontend locale files
      loadPath: join(__dirname, '../../frontend/src/i18n/locales/{{lng}}.json'),
    },
    interpolation: {
      escapeValue: false, // HTML will be escaped manually when needed
    },
  });

export default i18next;
