// src/services/AlarmService.ts
import {Platform} from 'react-native';
import type {Alarm} from '../types/alarm';
import {IOSAlarmKitModule} from '../native/IOSAlarmKitModule';
import {AndroidAlarmModule} from '../native/AndroidAlarmModule';

export const AlarmService = {
  async schedule(alarm: Alarm): Promise<void> {
    if (Platform.OS === 'ios') {
      await IOSAlarmKitModule.scheduleAlarm({
        id: alarm.id,
        hour: alarm.hour,
        minute: alarm.minute,
        label: alarm.label,
        repeatDays: alarm.repeatDays,
        // iOS no acepta sonido custom — forzar a sistema si llega 'custom' por error
        soundId: alarm.sound.type === 'system' ? alarm.sound.soundId : 'default',
      });
    } else {
      await AndroidAlarmModule.scheduleAlarm({
        id: alarm.id,
        hour: alarm.hour,
        minute: alarm.minute,
        label: alarm.label,
        repeatDays: alarm.repeatDays,
        soundUri: alarm.sound.type === 'custom' ? alarm.sound.uri : null,
        soundId: alarm.sound.type === 'system' ? alarm.sound.soundId : null,
        volume: alarm.volume,
        vibrate: alarm.vibrate,
      });
    }
  },

  async cancel(alarmId: string): Promise<void> {
    if (Platform.OS === 'ios') {
      await IOSAlarmKitModule.cancelAlarm(alarmId);
    } else {
      await AndroidAlarmModule.cancelAlarm(alarmId);
    }
  },

  async checkAvailability(): Promise<{available: boolean; reason?: string}> {
    if (Platform.OS === 'ios') {
      const iosVersion = parseInt(Platform.Version as string, 10);
      if (iosVersion < 26) {
        return {available: false, reason: 'AlarmKit requiere iOS 26 o superior'};
      }
      return {available: await IOSAlarmKitModule.isAvailable()};
    }
    return {available: true};
  },
};
