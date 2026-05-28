/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { geminiService } from '../services/geminiService';

import enLocale from '../locales/en/translation.json';
import hiLocale from '../locales/hi/translation.json';
import knLocale from '../locales/kn/translation.json';
import taLocale from '../locales/ta/translation.json';
import teLocale from '../locales/te/translation.json';
import mrLocale from '../locales/mr/translation.json';
import bnLocale from '../locales/bn/translation.json';
import mlLocale from '../locales/ml/translation.json';

export type LanguageCode = 'en' | 'kn' | 'hi' | 'ta' | 'te' | 'mr' | 'bn' | 'ml';

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' }
];

function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'object' && val !== null) {
        Object.assign(result, flattenObject(val, newKey));
      } else {
        result[newKey] = val;
        result[key.toLowerCase()] = val;
        result[key] = val;
      }
    }
  }
  return result;
}

export const i18nDictionary: Record<LanguageCode, Record<string, string>> = {
  en: flattenObject(enLocale),
  hi: flattenObject(hiLocale),
  kn: flattenObject(knLocale),
  ta: flattenObject(taLocale),
  te: flattenObject(teLocale),
  mr: flattenObject(mrLocale),
  bn: flattenObject(bnLocale),
  ml: flattenObject(mlLocale)
};

export async function translateLegalRights(text: string, targetLanguage: string): Promise<string> {
  if (!text || !text.trim() || targetLanguage === 'en') return text;
  
  const cacheKey = `loklink_libre_${targetLanguage}_${btoa(text.substring(0, 30))}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      body: JSON.stringify({
        q: text,
        source: "en",
        target: targetLanguage,
        format: "text"
      }),
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json();
    if (data.translatedText) {
      localStorage.setItem(cacheKey, data.translatedText);
      return data.translatedText;
    }
  } catch (e) {
    console.warn("LibreTranslate fetch failed, using internal AI fallback:", e);
  }
  
  // Dynamic Gemini translation fallback
  try {
    const geminiVal = await geminiService.translateText(text, targetLanguage);
    localStorage.setItem(cacheKey, geminiVal);
    return geminiVal;
  } catch (err) {
    return text;
  }
}

// React Context for Multi-language Translator
interface LanguageContextType {
  language: LanguageCode;
  changeLanguage: (code: LanguageCode) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>('en');

  // Load language preference from profile or localStorage or browser
  useEffect(() => {
    const stored = localStorage.getItem('loklink_lang') || localStorage.getItem('guest_lang');
    if (stored) {
      setLanguage(stored as LanguageCode);
    } else {
      const browserLang = navigator.language.substring(0, 2) as LanguageCode;
      const supported = LANGUAGES.some(l => l.code === browserLang);
      if (supported) {
        setLanguage(browserLang);
        localStorage.setItem('guest_lang', browserLang);
      } else {
        setLanguage('en');
      }
    }
  }, []);

  const changeLanguage = async (code: LanguageCode) => {
    setLanguage(code);
    localStorage.setItem('loklink_lang', code);
    localStorage.setItem('guest_lang', code);
    
    // Save to user profile if signed in
    const savedUid = localStorage.getItem('loklink_auth_uid');
    if (savedUid) {
      try {
        await dbService.updateProfile(savedUid, { language: code });
        localStorage.setItem(`lang_${savedUid}`, code);
      } catch (e) {}
    }
  };

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('loklink-db-updated', handleUpdate);
    return () => {
      window.removeEventListener('loklink-db-updated', handleUpdate);
    };
  }, []);

  const t = (key: string): string => {
    if (!key || !key.trim()) return '';
    
    const normalizedKey = key.trim();
    
    // If target language is English, return the key itself or the dictionary value
    if (language === 'en') {
      return i18nDictionary['en']?.[normalizedKey] || i18nDictionary['en']?.[normalizedKey.toLowerCase()] || normalizedKey;
    }

    // 1. Check static dictionary for translation
    const staticTranslation = i18nDictionary[language]?.[normalizedKey] || i18nDictionary[language]?.[normalizedKey.toLowerCase()];
    if (staticTranslation) return staticTranslation;

    // 2. Check cached dynamic translation in localStorage
    const cacheKey = `loklink_t_${language}_${normalizedKey}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    // 3. Trigger lazy background translation via Gemini
    const pendingKey = `loklink_pending_${language}_${normalizedKey}`;
    if (!localStorage.getItem(pendingKey)) {
      localStorage.setItem(pendingKey, 'true');
      geminiService.translateText(normalizedKey, language).then(translatedText => {
        if (translatedText && translatedText !== normalizedKey) {
          localStorage.setItem(cacheKey, translatedText);
          localStorage.removeItem(pendingKey);
          window.dispatchEvent(new Event('loklink-db-updated'));
        } else {
          localStorage.setItem(cacheKey, normalizedKey);
          localStorage.removeItem(pendingKey);
        }
      }).catch((err) => {
        console.error("Lazy translation error for key:", normalizedKey, err);
        localStorage.removeItem(pendingKey);
      });
    }

    return i18nDictionary['en']?.[normalizedKey] || i18nDictionary['en']?.[normalizedKey.toLowerCase()] || normalizedKey;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export async function translateText(text: string, targetLanguage: LanguageCode): Promise<string> {
  if (!text || !text.trim() || targetLanguage === 'en') return text;
  return geminiService.translateText(text, targetLanguage);
}
