// src/types/models.ts
// Modelos de datos - equivalente a Models/RoutineEvent.swift, Subtask.swift, SupportModels.swift

import type {EventCategory, TaskStatus, WeekDay} from './enums';

export interface RoutineEvent {
  id: string;
  title: string;
  routineDescription: string;
  purpose: string;
  objectives: string;
  dayRaw: string;
  startTime: string;
  endTime: string;
  categoryRaw: string;
  notes: string;
  alarmEnabled: boolean;
  alarmTime: string;
  alarmDaysRaw: string;
  notifyMinutesBefore: number;
  googleSynced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  detail: string;
  statusRaw: string;
  pomodoroMinutes: number | null;
  order: number;
  lastCompletedAt: string | null;
  archivedAt: string | null;
  totalCompletions: number;
  totalPomodorosCompleted: number;
  totalMinutesFocused: number;
  progressNotes: string;
  eventId: string | null;
}

export interface CompletionRecord {
  id: string;
  date: string;
  notes: string;
  eventId: string;
}

export interface PomodoroSession {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  eventTitle: string;
  subtaskTitle: string;
  subtaskId: string | null;
  completed: boolean;
}

export interface LogEntry {
  id: string;
  levelRaw: string;
  message: string;
  date: string;
  function: string;
}

// Helper types for computed properties
export interface RoutineEventWithComputed extends RoutineEvent {
  day: WeekDay;
  category: EventCategory;
  alarmDays: number[];
  activeSubtasks: SubtaskWithComputed[];
  archivedSubtasks: SubtaskWithComputed[];
  subtasksProgress: number;
  durationHours: number;
  isCompletedToday: boolean;
  streak: number;
}

export interface SubtaskWithComputed extends Subtask {
  status: TaskStatus;
  masteryLevel: import('./enums').MasteryLevel;
  progressToNextLevel: number;
  isArchived: boolean;
  isActive: boolean;
}

// Types for AI parsing
export interface ParsedRoutine {
  nombre: string;
  descripcion: string;
  proposito: string;
  objetivo: string;
  categoria: string;
  dias: number[];
  hora: string;
  duracionMinutos: number;
  alarma: {
    activa: boolean;
    dias: number[];
    hora: string;
  };
  subcategorias: string[];
}

export interface ParsedRoutineInput {
  title: string;
  routineDescription: string;
  purpose: string;
  objectives: string;
  category: EventCategory;
  day: WeekDay;
  startTime: string;
  durationMinutes: number;
  alarmEnabled: boolean;
  alarmTime: string;
  alarmDays: number[];
}

// Custom provider for AI
export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
}

// Pending notification for diagnostics
export interface PendingNotification {
  id: string;
  title: string;
  body: string;
  date: Date;
  routineId: string;
  routineTitle: string;
}

// App settings
export interface AppSettings {
  theme: import('./enums').AppThemeMode;
  language: import('./enums').AppLanguage;
  selectedProvider: string;
}