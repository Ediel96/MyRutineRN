// src/native/AndroidAlarmModule.ts
import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import type {EmitterSubscription} from 'react-native';

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
  eventId?: string;
  triggerTimeMs?: number;
  /** Texto de la notificación del servicio de alarma (ver buildAlarmContent). */
  notificationTitle?: string;
  notificationBody?: string;
};

type AlarmFiredPayload = {alarmId: string; eventId?: string};

const NativeModule = Platform.OS === 'android' ? NativeModules.AndroidAlarmModule : null;
const emitter = NativeModule ? new NativeEventEmitter(NativeModule) : null;

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

  getInitialAlarmIntent: (): Promise<AlarmFiredPayload | null> =>
    NativeModule ? NativeModule.getInitialAlarmIntent() : Promise.resolve(null),

  clearAlarmWindowFlags: (): Promise<void> =>
    NativeModule ? NativeModule.clearAlarmWindowFlags() : Promise.resolve(),

  addAlarmListener: (
    callback: (data: AlarmFiredPayload) => void,
  ): EmitterSubscription | null =>
    emitter ? emitter.addListener('AlarmFired', callback) : null,
};
