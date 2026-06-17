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
  alarmDefaultVibrate: boolean;
  alarmDefaultSnoozeEnabled: boolean;
  alarmDefaultSnoozeMinutes: 5 | 10 | 15 | 30;

  // Actions
  loadSettings: () => void;
  setTheme: (theme: AppThemeMode) => void;
  setLanguage: (language: AppLanguage) => void;
  setAlarmDefaultVibrate: (v: boolean) => void;
  setAlarmDefaultSnoozeEnabled: (v: boolean) => void;
  setAlarmDefaultSnoozeMinutes: (v: 5 | 10 | 15 | 30) => void;
  resetAllData: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: AppThemeMode.dark,
  language: AppLanguage.system,
  refreshID: '',
  isLoading: true,
  alarmDefaultVibrate: true,
  alarmDefaultSnoozeEnabled: true,
  alarmDefaultSnoozeMinutes: 5,

  loadSettings: () => {
    const themeStr = storage.getTheme() as AppThemeMode;
    const languageStr = storage.getLanguage() as AppLanguage;

    const theme = Object.values(AppThemeMode).includes(themeStr)
      ? themeStr
      : AppThemeMode.dark;
    const language = Object.values(AppLanguage).includes(languageStr)
      ? languageStr
      : AppLanguage.system;

    const bundle = language === AppLanguage.system ? 'en' : language;
    i18n.changeLanguage(bundle);

    set({
      theme,
      language,
      isLoading: false,
      alarmDefaultVibrate: storage.getAlarmDefaultVibrate(),
      alarmDefaultSnoozeEnabled: storage.getAlarmDefaultSnoozeEnabled(),
      alarmDefaultSnoozeMinutes: storage.getAlarmDefaultSnoozeMinutes(),
    });
  },

  setTheme: (theme) => {
    storage.setTheme(theme);
    set({theme});
  },

  setLanguage: (language) => {
    storage.setLanguage(language);
    const bundle = language === AppLanguage.system ? 'en' : language;
    i18n.changeLanguage(bundle);
    set({language, refreshID: Date.now().toString()});
  },

  setAlarmDefaultVibrate: (v) => {
    storage.setAlarmDefaultVibrate(v);
    set({alarmDefaultVibrate: v});
  },

  setAlarmDefaultSnoozeEnabled: (v) => {
    storage.setAlarmDefaultSnoozeEnabled(v);
    set({alarmDefaultSnoozeEnabled: v});
  },

  setAlarmDefaultSnoozeMinutes: (v) => {
    storage.setAlarmDefaultSnoozeMinutes(v);
    set({alarmDefaultSnoozeMinutes: v});
  },

  resetAllData: () => {
    storage.resetAllData();
    set({
      theme: AppThemeMode.dark,
      language: AppLanguage.system,
      refreshID: Date.now().toString(),
      alarmDefaultVibrate: true,
      alarmDefaultSnoozeEnabled: true,
      alarmDefaultSnoozeMinutes: 5,
    });
    i18n.changeLanguage('en');
  },
}));