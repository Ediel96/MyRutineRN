// src/navigation/RootNavigator.tsx
// Navegador principal - equivalente a RootView.swift con TabView

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTranslation} from 'react-i18next';
import {Text, View, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import type {RootStackParamList, TabParamList} from './types';
import {useTheme} from '../theme/useTheme';

// Screens
import TodayScreen from '../screens/TodayScreen';
import WeekScreen from '../screens/WeekScreen';
import CalendarScreen from '../screens/CalendarScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import EventEditorScreen from '../screens/EventEditorScreen';
import SubtaskEditorScreen from '../screens/SubtaskEditorScreen';
import PomodoroScreen from '../screens/PomodoroScreen';
import VoiceCreatorScreen from '../screens/VoiceCreatorScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AISettingsScreen from '../screens/AISettingsScreen';
import NotificationDiagnosticsScreen from '../screens/NotificationDiagnosticsScreen';
import LogsScreen from '../screens/LogsScreen';
import {AlarmListScreen} from '../screens/AlarmListScreen';
import {AlarmEditorScreen} from '../screens/AlarmEditorScreen';
import {AlarmRingingScreen} from '../screens/AlarmRingingScreen';
import {AndroidPermissionsOnboarding} from '../screens/AndroidPermissionsOnboarding';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabIcon: React.FC<{emoji: string; focused: boolean}> = ({emoji, focused}) => {
  const {colors, radius} = useTheme();
  return (
    <View
      style={[
        styles.tabIcon,
        {borderRadius: radius.lg},
        focused && {backgroundColor: colors.primary + '26'},
      ]}>
      <Text style={styles.tabIconText}>{emoji}</Text>
    </View>
  );
};

function TabNavigator() {
  const {t} = useTranslation();
  const {colors, typography} = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
          height: 64 + insets.bottom,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: typography.xs,
          fontWeight: typography.medium,
          marginTop: 2,
        },
      }}>
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarLabel: t('tabs.today'),
          tabBarIcon: ({focused}) => <TabIcon emoji="🌤" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Week"
        component={WeekScreen}
        options={{
          tabBarLabel: t('tabs.week'),
          tabBarIcon: ({focused}) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarLabel: t('tabs.calendar'),
          tabBarIcon: ({focused}) => <TabIcon emoji="🗓" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: t('tabs.stats'),
          tabBarIcon: ({focused}) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({focused}) => <TabIcon emoji="⚙️" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const {colors, typography} = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.surface},
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {fontWeight: typography.semibold, fontSize: typography.lg},
        headerShadowVisible: false,
        contentStyle: {backgroundColor: colors.background},
        animation: 'slide_from_right',
      }}>
      <Stack.Screen
        name="Main"
        component={TabNavigator}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{title: 'Routine Detail'}}
      />
      <Stack.Screen
        name="EventEditor"
        component={EventEditorScreen}
        options={{title: 'Edit Routine'}}
      />
      <Stack.Screen
        name="SubtaskEditor"
        component={SubtaskEditorScreen}
        options={{title: 'Subtask'}}
      />
      <Stack.Screen
        name="Pomodoro"
        component={PomodoroScreen}
        options={{headerShown: false, presentation: 'fullScreenModal'}}
      />
      <Stack.Screen
        name="VoiceCreator"
        component={VoiceCreatorScreen}
        options={{title: 'Create with AI', presentation: 'fullScreenModal'}}
      />
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{title: 'History'}}
      />
      <Stack.Screen
        name="AISettings"
        component={AISettingsScreen}
        options={{title: 'AI Settings'}}
      />
      <Stack.Screen
        name="NotificationDiagnostics"
        component={NotificationDiagnosticsScreen}
        options={{title: 'Notifications'}}
      />
      <Stack.Screen
        name="Logs"
        component={LogsScreen}
        options={{title: 'Logs'}}
      />
      <Stack.Screen
        name="AlarmList"
        component={AlarmListScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="AlarmEditor"
        component={AlarmEditorScreen}
        options={{title: 'Nueva alarma'}}
      />
      <Stack.Screen
        name="AlarmRinging"
        component={AlarmRingingScreen}
        options={{headerShown: false, presentation: 'fullScreenModal'}}
      />
      <Stack.Screen
        name="AndroidPermissionsOnboarding"
        component={AndroidPermissionsOnboarding}
        options={{title: 'Permisos'}}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconText: {
    fontSize: 18,
  },
});
