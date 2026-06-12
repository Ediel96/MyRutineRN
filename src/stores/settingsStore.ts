// src/stores/settingsStore.ts
// Store de configuración de la app - equivalente a UserDefaults + LanguageManager

import {create} from 'zustand';
import i18n from '../i18n';
import * as storage from '../services/storage';
import {AppThemeMode, AppLanguage} from '../types/enums';

interface SettingsState {
  theme: AppThemeMode;
  language: AppLanguage;
  refreshID: string;
  isLoading: boolean;

  // Actions
  loadSettings: () => void;
  setTheme: (theme: AppThemeMode) => void;
  setLanguage: (language: AppLanguage) => void;
  resetAllData: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: AppThemeMode.dark,
  language: AppLanguage.system,
  refreshID: '',
  isLoading: true,

  loadSettings: () => {
    const themeStr = storage.getTheme() as AppThemeMode;
    const languageStr = storage.getLanguage() as AppLanguage;

    const theme = Object.values(AppThemeMode).includes(themeStr)
      ? themeStr
      : AppThemeMode.dark;
    const language = Object.values(AppLanguage).includes(languageStr)
      ? languageStr
      : AppLanguage.system;

    // Apply language to i18n
    const bundle = language === AppLanguage.system ? 'en' : language;
    i18n.changeLanguage(bundle);

    set({theme, language, isLoading: false});
  },

  setTheme: (theme) => {
    storage.setTheme(theme);
    set({theme});
  },

  setLanguage: (language) => {
    storage.setLanguage(language);
    const bundle = language === AppLanguage.system ? 'en' : language;
    i18n.changeLanguage(bundle);

    // Force refresh
    set({language, refreshID: Date.now().toString()});
  },

  resetAllData: () => {
    storage.resetAllData();
    set({
      theme: AppThemeMode.dark,
      language: AppLanguage.system,
      refreshID: Date.now().toString(),
    });
    i18n.changeLanguage('en');
  },
}));