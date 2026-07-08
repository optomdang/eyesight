import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import english from 'src/utils/languages/en.json';
import vietnamese from 'src/utils/languages/vi.json';

const resources = {
  en: {
    translation: english,
  },
  vi: {
    translation: vietnamese,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'vi', // Default to Vietnamese
  fallbackLng: 'vi',

  interpolation: {
    escapeValue: false, // react already safes from xss
  },

  // Save language to localStorage when changed
  detection: {
    order: ['localStorage', 'navigator'],
    caches: ['localStorage'],
  },
});

// Listen for language changes and save to localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;
