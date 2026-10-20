import type { Locale } from '../domain/types.ts'

export function detectLocale(): Locale {
  try {
    const raw = localStorage.getItem('pocketnote')
    if (raw) {
      const locale = JSON.parse(raw).state?.settings?.locale
      if (locale === 'zh-TW' || locale === 'zh-CN' || locale === 'en') return locale
    }
  } catch {
    /* ignore broken storage */
  }
  const lang = navigator.language.toLowerCase()
  if (lang.startsWith('zh')) {
    if (lang.includes('cn') || lang.includes('sg') || lang.includes('hans')) return 'zh-CN'
    return 'zh-TW'
  }
  if (lang.startsWith('en')) return 'en'
  return 'zh-TW'
}
