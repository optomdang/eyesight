import { useTranslation as useI18nTranslation } from 'react-i18next';

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  const changeLanguage = (lng: 'en' | 'vi') => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language as 'en' | 'vi';

  return {
    t,
    i18n,
    changeLanguage,
    currentLanguage,
    isVietnamese: currentLanguage === 'vi',
    isEnglish: currentLanguage === 'en',
  };
};

// Export supported languages for components
export const SUPPORTED_LANGUAGES = [
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', nativeName: 'Tiếng Việt' },
  { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English' },
] as const;

export type SupportedLanguage = 'en' | 'vi';
