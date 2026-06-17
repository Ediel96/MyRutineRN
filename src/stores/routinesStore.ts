// src/stores/routinesStore.ts
// Store de rutinas - equivalente a SwiftData + lógica de RoutineEvent

import {create} from 'zustand';
import {v4 as uuidv4} from 'uuid';
import type {RoutineEvent, Subtask, CompletionRecord} from '../types';
import {WeekDay, EventCategory, TaskStatus, MasteryLevel} from '../types/enums';
import * as storage from '../services/storage';
import {
  scheduleAlarmsForRoutine,
  scheduleReminderForRoutine,
  cancelNotificationsForEvent,
  rescheduleAllNotifications,
} from '../services/notifications';

function runAsync(task: Promise<unknown>) {
  task.catch(() => {
    // No-op: fallos de notificaciones no deben romper estado local de rutinas.
  });
}

interface RoutinesState {
  events: RoutineEvent[];
  subtasks: Subtask[];
  completions: CompletionRecord[];
  isLoading: boolean;

  // Actions
  loadData: () => void;
  addEvent: (event: Omit<RoutineEvent, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateEvent: (id: string, updates: Partial<RoutineEvent>) => void;
  deleteEvent: (id: string) => void;
  getEventById: (id: string) => RoutineEvent | undefined;
  getEventsByDay: (day: WeekDay) => RoutineEvent[];
  getEventsToday: () => RoutineEvent[];

  addSubtask: (subtask: Omit<Subtask, 'id'>) => string;
  updateSubtask: (id: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (id: string) => void;
  getSubtasksByEventId: (eventId: string) => Subtask[];
  advanceSubtaskStatus: (id: string) => void;
  restoreSubtask: (id: string) => void;
  recordPomodoroForSubtask: (id: string, minutes: number) => void;

  toggleCompletedToday: (eventId: string) => void;
  isCompletedToday: (eventId: string) => boolean;
  calculateStreak: (eventId: string) => number;
  getTodayProgress: () => {completed: number; total: number};

  loadDefaults: () => void;
}

export const useRoutinesStore = create<RoutinesState>((set, get) => ({
  events: [],
  subtasks: [],
  completions: [],
  isLoading: true,

  loadData: () => {
    const events = storage.getAllRoutineEvents();
    const subtasks = storage.getAllSubtasks();
    const completions = storage.getAllCompletionRecords();
    set({events, subtasks, completions, isLoading: false});

    runAsync(rescheduleAllNotifications(events));

    // Load defaults if first launch
    if (!storage.hasLoadedDefaults() && events.length === 0) {
      get().loadDefaults();
    }
  },

  addEvent: (eventData) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const event: RoutineEvent = {
      ...eventData,
      id,
      createdAt: now,
      updatedAt: now,
    };
    storage.saveRoutineEvent(event);
    set(state => ({events: [...state.events, event]}));
    runAsync(scheduleAlarmsForRoutine(event));
    runAsync(scheduleReminderForRoutine(event));
    return id;
  },

  updateEvent: (id, updates) => {
    const current = get().events.find(e => e.id === id);
    if (!current) return;

    const updated: RoutineEvent = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storage.saveRoutineEvent(updated);
    set(state => ({
      events: state.events.map(e => (e.id === id ? updated : e)),
    }));

    runAsync(scheduleAlarmsForRoutine(updated));
    runAsync(scheduleReminderForRoutine(updated));
  },

  deleteEvent: (id) => {
    storage.deleteRoutineEvent(id);
    set(state => ({
      events: state.events.filter(e => e.id !== id),
      subtasks: state.subtasks.filter(s => s.eventId !== id),
      completions: state.completions.filter(c => c.eventId !== id),
    }));
    runAsync(cancelNotificationsForEvent(id));
  },

  getEventById: (id) => {
    return get().events.find(e => e.id === id);
  },

  getEventsByDay: (day) => {
    return get().events.filter(e => e.dayRaw === day);
  },

  getEventsToday: () => {
    const today = new Date().getDay();
    const dayMap: Record<number, WeekDay> = {
      0: WeekDay.sunday,
      1: WeekDay.monday,
      2: WeekDay.tuesday,
      3: WeekDay.wednesday,
      4: WeekDay.thursday,
      5: WeekDay.friday,
      6: WeekDay.saturday,
    };
    return get().getEventsByDay(dayMap[today] || WeekDay.monday);
  },

  addSubtask: (subtaskData) => {
    const id = uuidv4();
    const subtask: Subtask = {...subtaskData, id};
    storage.saveSubtask(subtask);
    set(state => ({subtasks: [...state.subtasks, subtask]}));
    return id;
  },

  updateSubtask: (id, updates) => {
    set(state => {
      const subtasks = state.subtasks.map(s =>
        s.id === id ? {...s, ...updates} : s,
      );
      const updated = subtasks.find(s => s.id === id);
      if (updated) storage.saveSubtask(updated);
      return {subtasks};
    });
  },

  deleteSubtask: (id) => {
    storage.deleteSubtask(id);
    set(state => ({
      subtasks: state.subtasks.filter(s => s.id !== id),
    }));
  },

  getSubtasksByEventId: (eventId) => {
    return get().subtasks.filter(s => s.eventId === eventId);
  },

  advanceSubtaskStatus: (id) => {
    const subtask = get().subtasks.find(s => s.id === id);
    if (!subtask) return;

    const statusOrder = [TaskStatus.todo, TaskStatus.doing, TaskStatus.done];
    const currentIndex = statusOrder.indexOf(subtask.statusRaw as TaskStatus);
    const nextIndex = Math.min(currentIndex + 1, statusOrder.length - 1);
    const newStatus = statusOrder[nextIndex];

    const now = new Date().toISOString();
    const updates: Partial<Subtask> = {statusRaw: newStatus};

    if (newStatus === TaskStatus.done) {
      updates.archivedAt = now;
      updates.lastCompletedAt = now;
      updates.totalCompletions = subtask.totalCompletions + 1;
    }

    get().updateSubtask(id, updates);
  },

  restoreSubtask: (id) => {
    get().updateSubtask(id, {
      statusRaw: TaskStatus.todo,
      archivedAt: null,
    });
  },

  recordPomodoroForSubtask: (id, minutes) => {
    const subtask = get().subtasks.find(s => s.id === id);
    if (!subtask) return;

    get().updateSubtask(id, {
      totalPomodorosCompleted: subtask.totalPomodorosCompleted + 1,
      totalMinutesFocused: subtask.totalMinutesFocused + minutes,
    });
  },

  toggleCompletedToday: (eventId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = get().completions.find(c => {
      const cDate = new Date(c.date);
      cDate.setHours(0, 0, 0, 0);
      return c.eventId === eventId && cDate.getTime() === today.getTime();
    });

    if (existing) {
      storage.deleteCompletionRecord(existing.id);
      set(state => ({
        completions: state.completions.filter(c => c.id !== existing.id),
      }));
    } else {
      const record: CompletionRecord = {
        id: uuidv4(),
        date: new Date().toISOString(),
        notes: '',
        eventId,
      };
      storage.saveCompletionRecord(record);
      set(state => ({completions: [...state.completions, record]}));
    }
  },

  isCompletedToday: (eventId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return get().completions.some(c => {
      const cDate = new Date(c.date);
      cDate.setHours(0, 0, 0, 0);
      return c.eventId === eventId && cDate.getTime() === today.getTime();
    });
  },

  calculateStreak: (eventId) => {
    const eventCompletions = get().completions
      .filter(c => c.eventId === eventId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (eventCompletions.length === 0) return 0;

    let streak = 0;
    let lastDate: Date | null = null;

    for (const completion of eventCompletions) {
      const compDate = new Date(completion.date);
      compDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        streak = 1;
        lastDate = compDate;
      } else {
        const diff = (lastDate.getTime() - compDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 6 && diff <= 8) {
          streak++;
          lastDate = compDate;
        } else {
          break;
        }
      }
    }

    return streak;
  },

  getTodayProgress: () => {
    const eventsToday = get().getEventsToday();
    const completed = eventsToday.filter(e => get().isCompletedToday(e.id)).length;
    return {completed, total: eventsToday.length};
  },

  loadDefaults: () => {
    // Create sample routines for first launch
    const defaultRoutines = [
      {
        title: 'Morning Workout',
        routineDescription: 'Daily exercise routine',
        purpose: 'Stay fit and healthy',
        objectives: 'Complete 45 minutes of exercise',
        dayRaw: WeekDay.monday,
        startTime: '07:00',
        endTime: '08:00',
        categoryRaw: EventCategory.gym,
        notes: '',
        alarmEnabled: true,
        alarmTime: '06:50',
        alarmDaysRaw: '2,3,4,5,6',
        notifyMinutesBefore: 10,
        googleSynced: false,
      },
      {
        title: 'Code Practice',
        routineDescription: 'Practice coding skills',
        purpose: 'Improve programming abilities',
        objectives: 'Work on a project for 1 hour',
        dayRaw: WeekDay.tuesday,
        startTime: '20:00',
        endTime: '21:00',
        categoryRaw: EventCategory.code,
        notes: '',
        alarmEnabled: true,
        alarmTime: '19:50',
        alarmDaysRaw: '2,4,6',
        notifyMinutesBefore: 10,
        googleSynced: false,
      },
      {
        title: 'English Practice',
        routineDescription: 'Practice English language',
        purpose: 'Improve language skills',
        objectives: 'Study for 30 minutes',
        dayRaw: WeekDay.wednesday,
        startTime: '18:00',
        endTime: '18:30',
        categoryRaw: EventCategory.english,
        notes: '',
        alarmEnabled: false,
        alarmTime: '17:50',
        alarmDaysRaw: '3,5',
        notifyMinutesBefore: 0,
        googleSynced: false,
      },
    ];

    for (const routine of defaultRoutines) {
      get().addEvent(routine);
    }

    storage.setHasLoadedDefaults(true);
  },
}));

// Helper functions
export function getMasteryLevel(pomodoros: number): MasteryLevel {
  if (pomodoros >= 100) return MasteryLevel.master;
  if (pomodoros >= 50) return MasteryLevel.expert;
  if (pomodoros >= 20) return MasteryLevel.advanced;
  if (pomodoros >= 5) return MasteryLevel.intermediate;
  return MasteryLevel.beginner;
}

export function getProgressToNextLevel(pomodoros: number): number {
  const thresholds = [0, 5, 20, 50, 100];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (pomodoros >= thresholds[i]) {
      if (i === thresholds.length - 1) return 1;
      const current = thresholds[i];
      const next = thresholds[i + 1];
      return (pomodoros - current) / (next - current);
    }
  }
  return 0;
}

export function getActiveSubtasks(subtasks: Subtask[]): Subtask[] {
  return subtasks
    .filter(s => s.statusRaw !== TaskStatus.done)
    .sort((a, b) => a.order - b.order);
}

export function getArchivedSubtasks(subtasks: Subtask[]): Subtask[] {
  return subtasks
    .filter(s => s.statusRaw === TaskStatus.done)
    .sort((a, b) => {
      const aDate = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
      const bDate = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
      return bDate - aDate;
    });
}

export function getSubtasksProgress(subtasks: Subtask[]): number {
  if (subtasks.length === 0) return 0;
  const done = subtasks.filter(s => s.statusRaw === TaskStatus.done).length;
  return done / subtasks.length;
}