import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';
import deTranslations from './locales/de.json';
import jaTranslations from './locales/ja.json';
import nlTranslations from './locales/nl.json';
import itTranslations from './locales/it.json';
import ptTranslations from './locales/pt.json';
import ruTranslations from './locales/ru.json';
import zhCNTranslations from './locales/zh-CN.json';
import koTranslations from './locales/ko.json';
import plTranslations from './locales/pl.json';
import trTranslations from './locales/tr.json';
import svTranslations from './locales/sv.json';
import noTranslations from './locales/no.json';

i18n
  .use(LanguageDetector) // Detects user language from browser settings
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      es: {
        translation: esTranslations,
      },
      fr: {
        translation: frTranslations,
      },
      de: {
        translation: deTranslations,
      },
      ja: {
        translation: jaTranslations,
      },
      nl: {
        translation: nlTranslations,
      },
      it: {
        translation: itTranslations,
      },
      pt: {
        translation: ptTranslations,
      },
      ru: {
        translation: ruTranslations,
      },
      'zh-CN': {
        translation: zhCNTranslations,
      },
      ko: {
        translation: koTranslations,
      },
      pl: {
        translation: plTranslations,
      },
      tr: {
        translation: trTranslations,
      },
      sv: {
        translation: svTranslations,
      },
      no: {
        translation: noTranslations,
      },
    },
    fallbackLng: 'en', // Default language
    debug: false, // Set to true for development debugging
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache user language preference
      caches: ['localStorage'],
    },
  });

export default i18n;
