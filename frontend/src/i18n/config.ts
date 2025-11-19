import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Lazy load translation files only when needed
const loadTranslation = async (language: string) => {
  console.log(`[i18n] Loading translation for: ${language}`);
  try {
    const translations = await import(`./locales/${language}.json`);
    console.log(`[i18n] Successfully loaded: ${language}`);
    return translations.default;
  } catch (error) {
    console.error(`[i18n] Failed to load ${language}:`, error);
    throw error;
  }
};

// Custom backend for lazy loading
const lazyLoadBackend = {
  type: "backend",
  init: () => {
    console.log("[i18n] Backend initialized");
  },
  read: async (
    language: string,
    _namespace: string,
    callback: (err: Error | null, data?: any) => void
  ) => {
    console.log(
      `[i18n] Backend.read called for language: ${language}, namespace: ${_namespace}`
    );
    try {
      const data = await loadTranslation(language);
      console.log(`[i18n] Backend.read successful for ${language}, keys:`, Object.keys(data).length);
      callback(null, data);
    } catch (error) {
      console.error(`[i18n] Backend.read failed for ${language}:`, error);
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
    fallbackLng: "en", // Default language
    debug: true, // Set to true for development debugging
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Order of language detection (only used if lng not explicitly set)
      order: ["querystring", "localStorage", "navigator", "htmlTag"],
      // Cache user language preference
      caches: ["localStorage"],
    },
    supportedLngs: [
      "en",
      "es",
      "fr",
      "de",
      "ja",
      "nl",
      "it",
      "pt",
      "ru",
      "zh",
      "ko",
      "pl",
      "tr",
      "sv",
      "no",
      "ro",
      "tl",
      "vi",
      "id",
    ],
    // Prevent loading fallback language immediately - wait for branding API
    load: "languageOnly",
    // Use backend for all languages
    partialBundledLanguages: false,
  });

// After i18n is initialized, fetch and apply branding language
const applyBrandingLanguage = async () => {
  try {
    const apiUrl = window.__RUNTIME_API_URL__ || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/branding`);
    if (response.ok) {
      const data = await response.json();
      console.log(
        `[i18n] Branding language: ${data.language}, current: ${i18n.language}`
      );
      if (data.language && i18n.language !== data.language) {
        console.log(
          `[i18n] Changing language from ${i18n.language} to ${data.language}`
        );
        await i18n.changeLanguage(data.language);
        console.log(
          `[i18n] Language changed successfully, now: ${i18n.language}`
        );
      }
    }
  } catch (error) {
    console.warn("Could not fetch branding language:", error);
  }
};

// Apply branding language after initialization
applyBrandingLanguage();

export default i18n;
