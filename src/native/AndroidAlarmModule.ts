// src/native/AndroidAlarmModule.ts
import {NativeModules, Platform} from 'react-native';

type ScheduleConfig = {
  id: string;
  hour: number;
  minute: number;
  label: string;
  repeatDays: number[];
  soundUri: string | null;
  soundId: string | null;
  volume: number;
  vibrate: boolean;
};

const NativeModule = Platform.OS === 'android' ? NativeModules.AndroidAlarmModule : null;

export const AndroidAlarmModule = {
  hasExactAlarmPermission: (): Promise<boolean> =>
    NativeModule ? NativeModule.hasExactAlarmPermission() : Promise.resolve(true),

  requestExactAlarmPermission: (): Promise<boolean> =>
    NativeModule ? NativeModule.requestExactAlarmPermission() : Promise.resolve(true),

  requestIgnoreBatteryOptimizations: (): Promise<boolean> =>
    NativeModule ? NativeModule.requestIgnoreBatteryOptimizations() : Promise.resolve(true),

  scheduleAlarm: (config: ScheduleConfig): Promise<string> =>
    NativeModule
      ? NativeModule.scheduleAlarm(config)
      : Promise.reject(new Error('Not Android')),

  cancelAlarm: (alarmId: string): Promise<boolean> =>
    NativeModule ? NativeModule.cancelAlarm(alarmId) : Promise.resolve(true),

  stopPlayback: (alarmId: string): Promise<boolean> =>
    NativeModule ? NativeModule.stopPlayback(alarmId) : Promise.resolve(true),

  snoozeAlarm: (alarmId: string, minutes: number): Promise<boolean> =>
    NativeModule ? NativeModule.snoozeAlarm(alarmId, minutes) : Promise.resolve(true),

  getInitialAlarmIntent: (): Promise<{alarmId: string} | null> =>
    NativeModule ? NativeModule.getInitialAlarmIntent() : Promise.resolve(null),
};
