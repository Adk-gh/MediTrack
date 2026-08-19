import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import your JSON dictionaries directly
import enTranslations from '../locales/en.json';
import filTranslations from '../locales/fil.json';

i18n
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    resources: {
      en: { translation: enTranslations },
      fil: { translation: filTranslations }
    },
    lng: 'en', // Your default starting language
    fallbackLng: 'en', // Fallback if a key is missing in Filipino
    interpolation: {
      escapeValue: false // React already escapes values automatically against XSS
    }
  });

export default i18n;