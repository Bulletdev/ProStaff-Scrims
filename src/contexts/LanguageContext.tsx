'use client'

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import { useMountEffect } from '@/hooks/useMountEffect'

import ptMessages from '../translations/pt.json'
import enMessages from '../translations/en.json'

export type Language = 'pt' | 'en'

const SUPPORTED: Language[] = ['pt', 'en']

const messagesByLocale: Record<Language, Record<string, string>> = {
  pt: ptMessages as Record<string, string>,
  en: enMessages as Record<string, string>,
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

function readSaved(): Language {
  if (typeof window === 'undefined') return 'pt'
  const cookie = document.cookie.match(/(?:^|;\s*)scrims_lang=([^;]*)/)
  const fromCookie = cookie ? decodeURIComponent(cookie[1]) : null
  if (fromCookie && SUPPORTED.includes(fromCookie as Language)) return fromCookie as Language
  try {
    const fromStorage = localStorage.getItem('scrims_lang')
    if (fromStorage && SUPPORTED.includes(fromStorage as Language)) return fromStorage as Language
  } catch (_) { /* ignore */ }
  return 'pt'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('pt')

  useMountEffect(() => {
    const saved = readSaved()
    if (saved !== 'pt') setLanguageState(saved)
  })

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    document.cookie = `scrims_lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    try { localStorage.setItem('scrims_lang', lang) } catch (_) { /* ignore */ }
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string>): string => {
      let msg = messagesByLocale[language][key] ?? messagesByLocale['pt'][key] ?? key
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          msg = msg.replace(`{{${k}}}`, v)
        })
      }
      return msg
    },
    [language]
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
