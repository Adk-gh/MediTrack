// frontend/src/utils/language.js
import i18n from './i18n';

/**
 * MediTrack Language Utility (Refactored for i18next)
 *
 * This file acts as a backward-compatible bridge. It allows your
 * existing code to continue calling translate() or t(), while fetching
 * the actual strings from the new JSON files via i18next.
 *
 * IMPORTANT FOR REACT COMPONENTS:
 * For future development, prefer using the `useTranslation()` hook inside
 * React components instead of importing this file. The hook ensures your
 * components re-render instantly when the user switches languages.
 */

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a language value.
 * Keeps compatibility with the current database values: "English" / "Filipino"
 * Also accepts: "en" / "fil"
 */
export const normalizeLanguage = (language) => {
  if (!language) return 'English';

  const normalized = String(language).trim().toLowerCase();

  if (normalized === 'fil' || normalized === 'filipino') {
    return 'Filipino';
  }

  if (normalized === 'en' || normalized === 'english') {
    return 'English';
  }

  return 'English';
};

/**
 * Check whether a language is supported.
 */
export const isSupportedLanguage = (language) => {
  const normalized = normalizeLanguage(language);
  return normalized === 'English' || normalized === 'Filipino';
};

/**
 * Return all supported language names.
 */
export const getSupportedLanguages = () => {
  return ['English', 'Filipino'];
};

/**
 * Get the translation object for a language directly from i18next.
 */
export const getTranslations = (language = 'English') => {
  const lngCode = normalizeLanguage(language) === 'Filipino' ? 'fil' : 'en';
  // Retrieve the full dictionary from i18next memory
  return i18n.getResourceBundle(lngCode, 'translation') || {};
};

/**
 * Translate a key using dot notation via i18next.
 *
 * Example:
 * translate('profile.birthday', 'Filipino') → "Kaarawan"
 */
export const translate = (key, language = 'English') => {
  if (!key || typeof key !== 'string') {
    return '';
  }

  // Convert "Filipino" to "fil" for i18next
  const lngCode = normalizeLanguage(language) === 'Filipino' ? 'fil' : 'en';

  // Use i18next's built-in translation fetcher
  return i18n.t(key, { lng: lngCode });
};

/**
 * Short alias for translate().
 */
export const t = translate;

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

// Exports a dynamic object mimicking your old constant so default imports don't crash
export default {
  get English() { return getTranslations('English'); },
  get Filipino() { return getTranslations('Filipino'); }
};