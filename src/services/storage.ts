// src/services/storage.ts
// Servicio de almacenamiento MMKV - equivalente a SwiftData/SwiftData

import {createMMKV} from 'react-native-mmkv';
import type {
  RoutineEvent,
  Subtask,
  CompletionRecord,
  PomodoroSession,
  LogEntry,
} from '../types';

// Crear instancia MMKV
export const storage = createMMKV({id: 'myroutine-storage'});

// Keys para almacenamiento
const KEYS = {
  ROUTINE_EVENTS: 'routine_events',
  SUBTASKS: 'subtasks',
  COMPLETION_RECORDS: 'completion_records',
  POMODORO_SESSIONS: 'pomodoro_sessions',
  LOG_ENTRIES: 'log_entries',
  SETTINGS: 'settings',
  CUSTOM_PROVIDERS: 'custom_providers',
  SELECTED_PROVIDER: 'selected_provider',
  THEME: 'theme',
  LANGUAGE: 'language',
  OPENAI_KEY: 'openai_key',
  ANTHROPIC_KEY: 'anthropic_key',
  HAS_LOADED_DEFAULTS: 'has_loaded_defaults',
  ALARM_DEFAULT_VIBRATE: 'alarm_default_vibrate',
  ALARM_DEFAULT_SNOOZE_ENABLED: 'alarm_default_snooze_enabled',
  ALARM_DEFAULT_SNOOZE_MINUTES: 'alarm_default_snooze_minutes',
};

// Helper para obtener/guardar arrays JSON
function getJSONArray<T>(key: string): T[] {
  const data = storage.getString(key);
  if (!data) return [];
  try {
    return JSON.parse(data) as T[];
  } catch {
    return [];
  }
}

function setJSONArray<T>(key: string, data: T[]): void {
  storage.set(key, JSON.stringify(data));
}

// ============ RoutineEvent ============
export function getAllRoutineEvents(): RoutineEvent[] {
  return getJSONArray<RoutineEvent>(KEYS.ROUTINE_EVENTS);
}

export function getRoutineEventById(id: string): RoutineEvent | undefined {
  return getAllRoutineEvents().find(e => e.id === id);
}

export function saveRoutineEvent(event: RoutineEvent): void {
  const events = getAllRoutineEvents();
  const index = events.findIndex(e => e.id === event.id);
  if (index >= 0) {
    events[index] = event;
  } else {
    events.push(event);
  }
  setJSONArray(KEYS.ROUTINE_EVENTS, events);
}

export function deleteRoutineEvent(id: string): void {
  const events = getAllRoutineEvents().filter(e => e.id !== id);
  setJSONArray(KEYS.ROUTINE_EVENTS, events);
  // Also delete related subtasks and completions
  const subtasks = getAllSubtasks().filter(s => s.eventId !== id);
  setJSONArray(KEYS.SUBTASKS, subtasks);
  const completions = getAllCompletionRecords().filter(c => c.eventId !== id);
  setJSONArray(KEYS.COMPLETION_RECORDS, completions);
}

// ============ Subtask ============
export function getAllSubtasks(): Subtask[] {
  return getJSONArray<Subtask>(KEYS.SUBTASKS);
}

export function getSubtasksByEventId(eventId: string): Subtask[] {
  return getAllSubtasks().filter(s => s.eventId === eventId);
}

export function getSubtaskById(id: string): Subtask | undefined {
  return getAllSubtasks().find(s => s.id === id);
}

export function saveSubtask(subtask: Subtask): void {
  const subtasks = getAllSubtasks();
  const index = subtasks.findIndex(s => s.id === subtask.id);
  if (index >= 0) {
    subtasks[index] = subtask;
  } else {
    subtasks.push(subtask);
  }
  setJSONArray(KEYS.SUBTASKS, subtasks);
}

export function deleteSubtask(id: string): void {
  const subtasks = getAllSubtasks().filter(s => s.id !== id);
  setJSONArray(KEYS.SUBTASKS, subtasks);
}

// ============ CompletionRecord ============
export function getAllCompletionRecords(): CompletionRecord[] {
  return getJSONArray<CompletionRecord>(KEYS.COMPLETION_RECORDS);
}

export function getCompletionRecordsByEventId(eventId: string): CompletionRecord[] {
  return getAllCompletionRecords().filter(c => c.eventId === eventId);
}

export function saveCompletionRecord(record: CompletionRecord): void {
  const records = getAllCompletionRecords();
  const index = records.findIndex(r => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  setJSONArray(KEYS.COMPLETION_RECORDS, records);
}

export function deleteCompletionRecord(id: string): void {
  const records = getAllCompletionRecords().filter(r => r.id !== id);
  setJSONArray(KEYS.COMPLETION_RECORDS, records);
}

// ============ PomodoroSession ============
export function getAllPomodoroSessions(): PomodoroSession[] {
  return getJSONArray<PomodoroSession>(KEYS.POMODORO_SESSIONS);
}

export function savePomodoroSession(session: PomodoroSession): void {
  const sessions = getAllPomodoroSessions();
  sessions.push(session);
  setJSONArray(KEYS.POMODORO_SESSIONS, sessions);
}

// ============ LogEntry ============
export function getAllLogEntries(): LogEntry[] {
  return getJSONArray<LogEntry>(KEYS.LOG_ENTRIES);
}

export function saveLogEntry(entry: LogEntry): void {
  const entries = getAllLogEntries();
  entries.push(entry);
  // Keep only last 500 entries
  const trimmed = entries.slice(-500);
  setJSONArray(KEYS.LOG_ENTRIES, trimmed);
}

// ============ Settings ============
export function getSelectedProvider(): string {
  return storage.getString(KEYS.SELECTED_PROVIDER) || 'builtin:anthropic';
}

export function setSelectedProvider(provider: string): void {
  storage.set(KEYS.SELECTED_PROVIDER, provider);
}

export function getCustomProviders(): string {
  return storage.getString(KEYS.CUSTOM_PROVIDERS) || '[]';
}

export function setCustomProviders(json: string): void {
  storage.set(KEYS.CUSTOM_PROVIDERS, json);
}

export function getTheme(): string {
  return storage.getString(KEYS.THEME) || 'dark';
}

export function setTheme(theme: string): void {
  storage.set(KEYS.THEME, theme);
}

export function getLanguage(): string {
  return storage.getString(KEYS.LANGUAGE) || 'system';
}

export function setLanguage(language: string): void {
  storage.set(KEYS.LANGUAGE, language);
}

export function hasLoadedDefaults(): boolean {
  return storage.getBoolean(KEYS.HAS_LOADED_DEFAULTS) || false;
}

export function setHasLoadedDefaults(value: boolean): void {
  storage.set(KEYS.HAS_LOADED_DEFAULTS, value);
}

// ============ Alarm defaults ============
export function getAlarmDefaultVibrate(): boolean {
  return storage.getBoolean(KEYS.ALARM_DEFAULT_VIBRATE) ?? true;
}
export function setAlarmDefaultVibrate(value: boolean): void {
  storage.set(KEYS.ALARM_DEFAULT_VIBRATE, value);
}
export function getAlarmDefaultSnoozeEnabled(): boolean {
  return storage.getBoolean(KEYS.ALARM_DEFAULT_SNOOZE_ENABLED) ?? true;
}
export function setAlarmDefaultSnoozeEnabled(value: boolean): void {
  storage.set(KEYS.ALARM_DEFAULT_SNOOZE_ENABLED, value);
}
export function getAlarmDefaultSnoozeMinutes(): 5 | 10 | 15 | 30 {
  const raw = storage.getNumber(KEYS.ALARM_DEFAULT_SNOOZE_MINUTES);
  return (raw === 5 || raw === 10 || raw === 15 || raw === 30) ? raw : 5;
}
export function setAlarmDefaultSnoozeMinutes(value: 5 | 10 | 15 | 30): void {
  storage.set(KEYS.ALARM_DEFAULT_SNOOZE_MINUTES, value);
}

// ============ Reset ============
export function resetAllData(): void {
  storage.clearAll();
}

export {KEYS};