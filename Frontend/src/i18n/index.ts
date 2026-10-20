import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { detectLocale } from './detect.ts'
import { en } from './en.ts'
import { zhCN } from './zh-CN.ts'
import { zhTW } from './zh-TW.ts'

void i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: detectLocale(),
  fallbackLng: 'zh-TW',
  interpolation: { escapeValue: false },
})

export default i18n

export function localeTag(): string {
  const language = i18n.language
  if (language === 'zh-CN' || language === 'en' || language === 'zh-TW') return language
  return 'zh-TW'
}
