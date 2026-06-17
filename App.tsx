// MyRoutineRN/App.tsx
// Entry point - equivalente a MyRoutineApp.swift

import React, {useEffect, useRef} from 'react';
import {Platform, StatusBar} from 'react-native';
import {NavigationContainer, DarkTheme, DefaultTheme} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import type {NavigationContainerRef} from '@react-navigation/native';

import './src/i18n';
import RootNavigator from './src/navigation/RootNavigator';
import {useRoutinesStore} from './src/stores/routinesStore';
import {useSettingsStore} from './src/stores/settingsStore';
import {useAISettingsStore} from './src/stores/aiSettingsStore';
import {setupNotificationChannel, requestNotificationPermission} from './src/services/notifications';
import {useTheme} from './src/theme/useTheme';
import {AndroidAlarmModule} from './src/native/AndroidAlarmModule';
import type {RootStackParamList} from './src/navigation/types';

function AppContent() {
  const {refreshID} = useSettingsStore();
  const {loadData: loadRoutines} = useRoutinesStore();
  const {loadSettings: loadAI} = useAISettingsStore();
  const {loadSettings} = useSettingsStore();
  const {colors, isDark} = useTheme();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    const init = async () => {
      loadSettings();
      loadRoutines();
      loadAI();
      await setupNotificationChannel();
      await requestNotificationPermission();
    };
    init();
  }, []);

  // Android: handle alarm navigation
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    // Cold start: check if app was opened by an alarm.
    // Poll until nav is ready to avoid the 500ms fixed delay.
    let cancelled = false;
    AndroidAlarmModule.getInitialAlarmIntent()
      .then(data => {
        if (!data?.alarmId || cancelled) return;
        const tryNav = () => {
          if (cancelled) return;
          if (navigationRef.current?.isReady()) {
            navigationRef.current.navigate('AlarmRinging', {
              alarmId: data.alarmId,
              eventId: data.eventId,
            });
          } else {
            setTimeout(tryNav, 80);
          }
        };
        tryNav();
      })
      .catch(() => {});

    // Hot path: alarm fires while app is already running
    const subscription = AndroidAlarmModule.addAlarmListener(data => {
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate('AlarmRinging', {
          alarmId: data.alarmId,
          eventId: data.eventId,
        });
      }
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
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
    <NavigationContainer theme={navTheme} ref={navigationRef}>
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
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
