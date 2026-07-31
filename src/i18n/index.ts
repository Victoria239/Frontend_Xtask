/* i18n setup — 6 idiomas con detección browser + persistencia localStorage.
 *
 * Fallback chain: <usuario> → browser → es.
 * Lazy loading: cada locale es un import async para no bloar el bundle.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import es from "./locales/es.json";
import en from "./locales/en.json";
import ca from "./locales/ca.json";
import fr from "./locales/fr.json";
import pt from "./locales/pt.json";
import de from "./locales/de.json";

export const SUPPORTED_LANGUAGES = [
  { code: "es", name: "Español",   flag: "🇪🇸", english: "Spanish" },
  { code: "en", name: "English",   flag: "🇬🇧", english: "English" },
  { code: "ca", name: "Català",    flag: "🇦🇩", english: "Catalan" },
  { code: "fr", name: "Français",  flag: "🇫🇷", english: "French" },
  { code: "pt", name: "Português", flag: "🇵🇹", english: "Portuguese" },
  { code: "de", name: "Deutsch",   flag: "🇩🇪", english: "German" },
] as const;

export type LangCode = typeof SUPPORTED_LANGUAGES[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      ca: { translation: ca },
      fr: { translation: fr },
      pt: { translation: pt },
      de: { translation: de },
    },
    fallbackLng: "es",
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    interpolation: {
      escapeValue: false, // React ya escapea
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "xt.lang",
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false, // Importamos directo, sin Suspense
    },
  });

export default i18n;
