// MyRoutineRN/App.tsx
// Entry point - equivalente a MyRoutineApp.swift

import React, {useEffect} from 'react';
import {StatusBar, useColorScheme} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';
import {useRoutinesStore} from './src/stores/routinesStore';
import {useSettingsStore} from './src/stores/settingsStore';
import {useAISettingsStore} from './src/stores/aiSettingsStore';
import {setupNotificationChannel, requestNotificationPermission} from './src/services/notifications';
import {colors} from './src/theme/AppTheme';
import {AppThemeMode} from './src/types/enums';

function AppContent() {
  const systemColorScheme = useColorScheme();
  const {theme, refreshID} = useSettingsStore();
  const {loadData: loadRoutines} = useRoutinesStore();
  const {loadSettings: loadAI} = useAISettingsStore();
  const {loadSettings} = useSettingsStore();

  useEffect(() => {
    // Initialize app
    const init = async () => {
      loadSettings();
      loadRoutines();
      loadAI();
      await setupNotificationChannel();
      await requestNotificationPermission();
    };
    init();
  }, []);

  const isDark =
    theme === AppThemeMode.dark ||
    (theme === AppThemeMode.system && systemColorScheme === 'dark');

  return (
    <NavigationContainer>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? colors.backgroundDark : colors.backgroundLight}
      />
      <RootNavigator key={refreshID} />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}