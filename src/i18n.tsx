import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language } from './types';
import { TRANSLATIONS, TranslationSchema } from './data/translations';

export type { TranslationSchema };
export { TRANSLATIONS };

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: TranslationSchema;
  getIconTitle: (action: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode; initialLang?: Language }> = ({
  children,
  initialLang = 'ar',
}) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('vex_lang') as Language;
    return saved && TRANSLATIONS[saved] ? saved : initialLang;
  });

  const setLang = (newLang: Language) => {
    if (TRANSLATIONS[newLang]) {
      setLangState(newLang);
      localStorage.setItem('vex_lang', newLang);
      document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLang;
    }
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];

  const getIconTitle = (action: string): string => {
    const map: Record<string, Record<Language, string>> = {
      copy: { ar: 'نسخ', en: 'Copy', es: 'Copiar', ru: 'Копировать' },
      share: { ar: 'مشاركة', en: 'Share', es: 'Compartir', ru: 'Поделиться' },
      refresh: { ar: 'تحديث', en: 'Refresh', es: 'Actualizar', ru: 'Обновить' },
      settings: { ar: 'الإعدادات', en: 'Settings', es: 'Ajustes', ru: 'Настройки' },
      close: { ar: 'إغلاق', en: 'Close', es: 'Cerrar', ru: 'Закрыть' },
      info: { ar: 'معلومات', en: 'Info', es: 'Información', ru: 'Информация' },
      search: { ar: 'بحث', en: 'Search', es: 'Buscar', ru: 'Поиск' },
      delete: { ar: 'حذف', en: 'Delete', es: 'Eliminar', ru: 'Удалить' },
      edit: { ar: 'تعديل', en: 'Edit', es: 'Editar', ru: 'Редактировать' },
    };
    return map[action]?.[lang] || map[action]?.['ar'] || action;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, getIconTitle }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
