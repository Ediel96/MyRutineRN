// src/types/alarm.ts

export type AlarmSoundSource =
  | {type: 'system'; soundId: string; label: string}
  | {type: 'custom'; uri: string; fileName: string}; // solo Android

export type AlarmRepeatDay = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

export type Alarm = {
  id: string;
  hour: number;
  minute: number;
  label: string;
  enabled: boolean;
  repeatDays: AlarmRepeatDay[]; // [] = una sola vez
  sound: AlarmSoundSource;
  volume: number; // 0-100
  snoozeMinutes: 5 | 10 | 15 | 30;
  snoozeEnabled: boolean;
  vibrate: boolean;
  createdAt: string;
  updatedAt: string;
};
