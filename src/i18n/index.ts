import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN';
import zhTW from './locales/zh-TW';
import en from './locales/en';
import ja from './locales/ja';
import ko from './locales/ko';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
      'en':    { translation: en },
      'ja':    { translation: ja },
      'ko':    { translation: ko },
    },
    lng: localStorage.getItem('video2sprite-lang') || 'zh-CN',
    fallbackLng: 'zh-CN',
    interpolation: { escapeValue: false },
  });

export default i18n;
