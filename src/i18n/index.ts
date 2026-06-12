// src/i18n/index.ts
// Configuración de i18next - equivalente a Managers/LanguageManager.swift

import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

const resources = {
  en: {translation: en},
  es: {translation: es},
  fr: {translation: fr},
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

export default i18n;