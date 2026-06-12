// src/navigation/RootNavigator.tsx
// Navegador principal - equivalente a RootView.swift con TabView

import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTranslation} from 'react-i18next';
import {Text, View, StyleSheet} from 'react-native';

import type {RootStackParamList, TabParamList} from './types';
import {colors} from '../theme/AppTheme';

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

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabIcon: React.FC<{emoji: string; focused: boolean}> = ({emoji, focused}) => (
  <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
    <Text style={styles.tabIconText}>{emoji}</Text>
  </View>
);

function TabNavigator() {
  const {t} = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray500,
        tabBarLabelStyle: styles.tabLabel,
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
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.white},
        headerTintColor: colors.textPrimaryLight,
        headerShadowVisible: false,
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
        options={{title: 'Pomodoro', presentation: 'fullScreenModal'}}
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
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.gray200,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    height: 60,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  tabIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  tabIconFocused: {
    backgroundColor: colors.gray100,
  },
  tabIconText: {
    fontSize: 18,
  },
});