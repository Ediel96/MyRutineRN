// src/native/IOSAlarmKitModule.ts
import {NativeModules, Platform} from 'react-native';

type ScheduleConfig = {
  id: string;
  hour: number;
  minute: number;
  label: string;
  repeatDays: number[];
  soundId: string;
};

const NativeModule = Platform.OS === 'ios' ? NativeModules.IOSAlarmKitModule : null;

export const IOSAlarmKitModule = {
  isAvailable: (): Promise<boolean> =>
    NativeModule ? NativeModule.isAvailable() : Promise.resolve(false),

  requestAuthorization: (): Promise<boolean> =>
    NativeModule ? NativeModule.requestAuthorization() : Promise.resolve(false),

  scheduleAlarm: (config: ScheduleConfig): Promise<string> =>
    NativeModule
      ? NativeModule.scheduleAlarm(config)
      : Promise.reject(new Error('AlarmKit not available')),

  cancelAlarm: (alarmId: string): Promise<boolean> =>
    NativeModule ? NativeModule.cancelAlarm(alarmId) : Promise.resolve(true),

  snoozeAlarm: (alarmId: string, minutes: number): Promise<boolean> =>
    NativeModule ? NativeModule.snoozeAlarm(alarmId, minutes) : Promise.resolve(true),
};
