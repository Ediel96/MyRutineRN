// src/stores/alarmStore.ts
import {create} from 'zustand';
import {v4 as uuidv4} from 'uuid';
import {createMMKV} from 'react-native-mmkv';
import type {Alarm} from '../types/alarm';
import {AlarmService} from '../services/AlarmService';

const storage = createMMKV({id: 'alarms-storage'});
const STORAGE_KEY = 'alarms-list';

type AlarmStore = {
  alarms: Alarm[];
  loadAlarms: () => void;
  createAlarm: (input: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateAlarm: (id: string, patch: Partial<Alarm>) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string, enabled: boolean) => Promise<void>;
};

function persist(alarms: Alarm[]) {
  storage.set(STORAGE_KEY, JSON.stringify(alarms));
}

export const useAlarmStore = create<AlarmStore>((set, get) => ({
  alarms: [],

  loadAlarms: () => {
    const raw = storage.getString(STORAGE_KEY);
    set({alarms: raw ? JSON.parse(raw) : []});
  },

  createAlarm: async input => {
    const now = new Date().toISOString();
    const alarm: Alarm = {...input, id: uuidv4(), createdAt: now, updatedAt: now};

    // Registrar en el sistema nativo ANTES de persistir en JS.
    // Si falla la programación nativa, no guardamos un estado inconsistente.
    await AlarmService.schedule(alarm);

    const alarms = [...get().alarms, alarm];
    set({alarms});
    persist(alarms);
    return alarm.id;
  },

  updateAlarm: async (id, patch) => {
    const current = get().alarms.find(a => a.id === id);
    if (!current) {
      return;
    }
    const updated: Alarm = {...current, ...patch, updatedAt: new Date().toISOString()};

    // AlarmKit y AlarmManager no soportan "editar in-place" — siempre cancel + create
    await AlarmService.cancel(id);
    if (updated.enabled) {
      await AlarmService.schedule(updated);
    }

    const alarms = get().alarms.map(a => (a.id === id ? updated : a));
    set({alarms});
    persist(alarms);
  },

  deleteAlarm: async id => {
    await AlarmService.cancel(id);
    const alarms = get().alarms.filter(a => a.id !== id);
    set({alarms});
    persist(alarms);
  },

  toggleAlarm: async (id, enabled) => {
    const current = get().alarms.find(a => a.id === id);
    if (!current) {
      return;
    }

    if (enabled) {
      await AlarmService.schedule({...current, enabled: true});
    } else {
      await AlarmService.cancel(id);
    }

    const alarms = get().alarms.map(a =>
      a.id === id ? {...a, enabled, updatedAt: new Date().toISOString()} : a,
    );
    set({alarms});
    persist(alarms);
  },
}));
