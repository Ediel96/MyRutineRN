// src/navigation/types.ts
// Tipos de navegación - equivalente a NavigationStack en SwiftUI

import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {CompositeScreenProps, NavigatorScreenParams} from '@react-navigation/native';

// Tab navigator params
export type TabParamList = {
  Today: undefined;
  Week: undefined;
  Calendar: undefined;
  Stats: undefined;
  Settings: undefined;
};

// Root stack params
export type RootStackParamList = {
  Main: NavigatorScreenParams<TabParamList>;
  EventDetail: {eventId: string};
  EventEditor: {eventId?: string};
  SubtaskEditor: {eventId: string; subtaskId?: string};
  Pomodoro: {eventId: string; subtaskId?: string};
  VoiceCreator: undefined;
  History: {eventId: string};
  AISettings: undefined;
  NotificationDiagnostics: undefined;
  Logs: undefined;
};

// Screen props types
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}