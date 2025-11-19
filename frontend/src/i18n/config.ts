import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Lazy load translation files only when needed
const loadTranslation = async (language: string) => {
  const translations = await import(`./locales/${language}.json`);
  return translations.default;
};

// Custom backend for lazy loading
const lazyLoadBackend = {
  type: 'backend',
  init: () => {},
  read: async (language: string, _namespace: string, callback: (err: Error | null, data?: any) => void) => {
    try {
      const data = await loadTranslation(language);
      callback(null, data);
    } catch (error) {
      callback(error as Error);
    }
  },
};

// Initialize i18n with lazy loading
i18n
  .use(lazyLoadBackend as any)
  .use(LanguageDetector) // Detects user language from browser settings
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    fallbackLng: 'en', // Default language
    debug: false, // Set to true for development debugging
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Order of language detection (only used if lng not explicitly set)
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      // Cache user language preference
      caches: ['localStorage'],
    },
    supportedLngs: ['en', 'es', 'fr', 'de', 'ja', 'nl', 'it', 'pt', 'ru', 'zh-CN', 'ko', 'pl', 'tr', 'sv', 'no'],
    // Prevent loading fallback language immediately - wait for branding API
    load: 'languageOnly',
    // Don't preload any languages - only load when explicitly requested
    preload: [],
  });

// After i18n is initialized, fetch and apply branding language
const applyBrandingLanguage = async () => {
  try {
    const apiUrl = window.__RUNTIME_API_URL__ || 'http://localhost:3001';
    const response = await fetch(`${apiUrl}/api/branding`);
    if (response.ok) {
      const data = await response.json();
      if (data.language && i18n.language !== data.language) {
        await i18n.changeLanguage(data.language);
      }
    }
  } catch (error) {
    console.warn('Could not fetch branding language:', error);
  }
};

// Apply branding language after initialization
applyBrandingLanguage();

export default i18n;
