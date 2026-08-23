// src/stores/nonNegotiablesStore.ts
// Estado de No Negociables. Ver docs/no-negociables.md.
//
// Este store solo conecta el almacenamiento con la lógica pura de
// services/nonNegotiablesLogic.ts. Toda regla temporal (racha, porcentajes,
// pending→missed) vive allí y está cubierta por tests.

import {create} from 'zustand';
import {v4 as uuidv4} from 'uuid';
import * as storage from '../services/storage';
import {
  toDateKey,
  activeNonNegotiables,
  calculateGlobalStreak,
  getCompletionStats,
  effectiveStatus,
  type CompletionStats,
} from '../services/nonNegotiablesLogic';
import {
  scheduleNonNegotiablesReminder,
  cancelNonNegotiablesReminder,
} from '../services/notifications';
import type {
  NonNegotiable,
  NonNegotiableRecord,
  NonNegotiableStatus,
} from '../types/nonNegotiable';
import {MAX_ACTIVE_NON_NEGOTIABLES} from '../types/nonNegotiable';

function runAsync(task: Promise<unknown>) {
  task.catch(() => {
    // Igual que en routinesStore: un fallo de notificaciones no debe romper
    // el estado local.
  });
}

interface NonNegotiablesState {
  items: NonNegotiable[];
  records: NonNegotiableRecord[];
  enabled: boolean;
  hour: number;
  minute: number;
  isLoading: boolean;

  loadData: () => void;

  addItem: (title: string, emoji: string) => string | null;
  updateItem: (id: string, updates: Partial<NonNegotiable>) => void;
  setItemActive: (id: string, isActive: boolean) => void;
  deleteItem: (id: string) => void;
  deleteAll: () => void;

  setEnabled: (value: boolean) => void;
  setTime: (hour: number, minute: number) => void;
  /** Reprograma o cancela el recordatorio diario según el estado actual. */
  syncReminder: () => void;

  /** Crea los registros `pending` de hoy para los activos que aún no lo tengan. */
  ensureTodayRecords: () => void;
  setStatus: (nonNegotiableId: string, status: NonNegotiableStatus) => void;

  getTodayEntries: () => {item: NonNegotiable; status: NonNegotiableStatus}[];
  getStreak: () => number;
  getStats: (nonNegotiableId: string) => CompletionStats;
  canAddMore: () => boolean;
}

export const useNonNegotiablesStore = create<NonNegotiablesState>((set, get) => ({
  items: [],
  records: [],
  enabled: false,
  hour: 21,
  minute: 0,
  isLoading: true,

  loadData: () => {
    set({
      items: storage.getAllNonNegotiables(),
      records: storage.getAllNonNegotiableRecords(),
      enabled: storage.getNonNegotiablesEnabled(),
      hour: storage.getNonNegotiablesHour(),
      minute: storage.getNonNegotiablesMinute(),
      isLoading: false,
    });
    get().ensureTodayRecords();
    get().syncReminder();
  },

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  addItem: (title, emoji) => {
    if (!get().canAddMore()) return null;

    const now = new Date();
    const item: NonNegotiable = {
      id: uuidv4(),
      title: title.trim(),
      emoji,
      kind: 'simple',
      formulaRaw: null,
      isActive: true,
      order: activeNonNegotiables(get().items).length,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const items = [...get().items, item];
    storage.saveAllNonNegotiables(items);

    // H1: el día de creación SÍ es exigible, aunque se cree después de la hora
    // del recordatorio. Quien lo crea sabe si lo ha cumplido hoy.
    const record: NonNegotiableRecord = {
      id: uuidv4(),
      nonNegotiableId: item.id,
      date: toDateKey(now),
      status: 'pending',
      respondedAt: null,
    };
    const records = [...get().records, record];
    storage.saveAllNonNegotiableRecords(records);

    set({items, records});
    get().syncReminder();
    return item.id;
  },

  updateItem: (id, updates) => {
    const items = get().items.map(n =>
      n.id === id ? {...n, ...updates, updatedAt: new Date().toISOString()} : n,
    );
    storage.saveAllNonNegotiables(items);
    set({items});
  },

  setItemActive: (id, isActive) => {
    const items = get().items.map(n =>
      n.id === id ? {...n, isActive, updatedAt: new Date().toISOString()} : n,
    );
    storage.saveAllNonNegotiables(items);

    let records = get().records;

    if (!isActive) {
      // Al desactivar se borra SOLO el registro de HOY y SOLO si sigue sin
      // responder. Si no, crear uno por error y quitarlo al minuto dejaría un
      // `pending` que al cerrar el día rompería la racha por una corrección.
      // Los días anteriores y las respuestas ya dadas no se tocan: sigue sin
      // poderse "arreglar" un martes fallado desactivando el no negociable.
      const todayKey = toDateKey(new Date());
      records = records.filter(
        r => !(r.nonNegotiableId === id && r.date === todayKey && r.status === 'pending'),
      );
      storage.saveAllNonNegotiableRecords(records);
    }

    set({items, records});
    // Reactivar vuelve a exigirlo desde hoy hacia adelante (H2).
    if (isActive) get().ensureTodayRecords();
    get().syncReminder();
  },

  deleteItem: id => {
    // Borrar mantiene el historial de los días pasados: el registro es la
    // fuente de verdad de qué se exigía cada día. Solo se quita el pending
    // de hoy, por el mismo motivo que en setItemActive.
    const todayKey = toDateKey(new Date());
    const items = get().items.filter(n => n.id !== id);
    const records = get().records.filter(
      r => !(r.nonNegotiableId === id && r.date === todayKey && r.status === 'pending'),
    );
    storage.saveAllNonNegotiables(items);
    storage.saveAllNonNegotiableRecords(records);
    set({items, records});
    get().syncReminder();
  },

  deleteAll: () => {
    storage.deleteAllNonNegotiableData();
    set({items: [], records: []});
    runAsync(cancelNonNegotiablesReminder());
  },

  // -------------------------------------------------------------------------
  // Configuración
  // -------------------------------------------------------------------------

  setEnabled: value => {
    storage.setNonNegotiablesEnabled(value);
    set({enabled: value});
    get().syncReminder();
  },

  setTime: (hour, minute) => {
    storage.setNonNegotiablesTime(hour, minute);
    set({hour, minute});
    get().syncReminder();
  },

  // -------------------------------------------------------------------------
  // Día en curso
  // -------------------------------------------------------------------------

  ensureTodayRecords: () => {
    const todayKey = toDateKey(new Date());
    const active = activeNonNegotiables(get().items);
    const existing = new Set(
      get().records.filter(r => r.date === todayKey).map(r => r.nonNegotiableId),
    );

    const missing = active.filter(n => !existing.has(n.id));
    if (missing.length === 0) return;

    const nuevos: NonNegotiableRecord[] = missing.map(n => ({
      id: uuidv4(),
      nonNegotiableId: n.id,
      date: todayKey,
      status: 'pending',
      respondedAt: null,
    }));

    const records = [...get().records, ...nuevos];
    storage.saveAllNonNegotiableRecords(records);
    set({records});
  },

  setStatus: (nonNegotiableId, status) => {
    const todayKey = toDateKey(new Date());
    const now = new Date().toISOString();

    let found = false;
    let records = get().records.map(r => {
      if (r.nonNegotiableId === nonNegotiableId && r.date === todayKey) {
        found = true;
        return {...r, status, respondedAt: now};
      }
      return r;
    });

    if (!found) {
      records = [
        ...records,
        {
          id: uuidv4(),
          nonNegotiableId,
          date: todayKey,
          status,
          respondedAt: now,
        },
      ];
    }

    storage.saveAllNonNegotiableRecords(records);
    set({records});
  },

  // -------------------------------------------------------------------------
  // Consultas
  // -------------------------------------------------------------------------

  getTodayEntries: () => {
    const todayKey = toDateKey(new Date());
    const byId = new Map(
      get()
        .records.filter(r => r.date === todayKey)
        .map(r => [r.nonNegotiableId, r]),
    );

    return activeNonNegotiables(get().items).map(item => {
      const record = byId.get(item.id);
      return {
        item,
        status: record ? effectiveStatus(record, todayKey) : ('pending' as const),
      };
    });
  },

  getStreak: () => calculateGlobalStreak(get().records, new Date()),

  getStats: nonNegotiableId =>
    getCompletionStats(get().records, nonNegotiableId, new Date()),

  canAddMore: () => activeNonNegotiables(get().items).length < MAX_ACTIVE_NON_NEGOTIABLES,

  /**
   * P8: sin no negociables activos no se programa notificación — avisar para
   * revisar una lista vacía es ruido. Se llama tras cualquier cambio que pueda
   * alterar el número de activos o la hora.
   */
  syncReminder: () => {
    const {enabled, items, hour, minute} = get();
    const activeCount = activeNonNegotiables(items).length;

    if (!enabled || activeCount === 0) {
      runAsync(cancelNonNegotiablesReminder());
      return;
    }
    runAsync(scheduleNonNegotiablesReminder(hour, minute, activeCount));
  },
}));
