// MyRoutineRN/App.tsx
// Entry point - equivalente a MyRoutineApp.swift

import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer, DarkTheme, DefaultTheme} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';
import {useRoutinesStore} from './src/stores/routinesStore';
import {useSettingsStore} from './src/stores/settingsStore';
import {useAISettingsStore} from './src/stores/aiSettingsStore';
import {setupNotificationChannel, requestNotificationPermission} from './src/services/notifications';
import {useTheme} from './src/theme/useTheme';

function AppContent() {
  const {refreshID} = useSettingsStore();
  const {loadData: loadRoutines} = useRoutinesStore();
  const {loadSettings: loadAI} = useAISettingsStore();
  const {loadSettings} = useSettingsStore();
  const {colors, isDark} = useTheme();

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

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.accentSecondary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
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