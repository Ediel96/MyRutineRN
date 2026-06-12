// src/stores/pomodoroStore.ts
// Store de Pomodoro - equivalente a Managers/PomodoroManager.swift

import {create} from 'zustand';
import {v4 as uuidv4} from 'uuid';
import type {PomodoroSession} from '../types';
import {PomodoroPhase} from '../types/enums';
import * as storage from '../services/storage';
import {useRoutinesStore} from './routinesStore';

interface PomodoroState {
  phase: PomodoroPhase;
  secondsRemaining: number;
  pomodorosCompleted: number;
  running: boolean;
  eventTitle: string;
  subtaskTitle: string;
  subtaskId: string | null;
  currentPhaseIndex: number;

  // Internal
  _timer: ReturnType<typeof setInterval> | null;
  _context: ReturnType<typeof useRoutinesStore.getState>;

  // Actions
  start: (eventTitle: string, subtaskTitle?: string, subtaskId?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skipPhase: () => void;
  _tick: () => void;
  _completePhase: () => void;
  _scheduleNotification: () => void;
  _resetTimer: () => void;
}

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes
const POMODOROS_BEFORE_LONG_BREAK = 4;

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  phase: PomodoroPhase.stopped,
  secondsRemaining: 0,
  pomodorosCompleted: 0,
  running: false,
  eventTitle: '',
  subtaskTitle: '',
  subtaskId: null,
  currentPhaseIndex: 0,
  _timer: null,
  _context: useRoutinesStore.getState,

  _resetTimer: () => {
    const state = get();
    if (state._timer) {
      clearInterval(state._timer);
    }
    set({_timer: null, running: false});
  },

  _tick: () => {
    const state = get();
    if (state.secondsRemaining <= 1) {
      get()._completePhase();
    } else {
      set({secondsRemaining: state.secondsRemaining - 1});
    }
  },

  _completePhase: () => {
    get()._resetTimer();
    const state = get();

    if (state.phase === PomodoroPhase.work) {
      // Record completed pomodoro
      const session: PomodoroSession = {
        id: uuidv4(),
        startedAt: new Date(Date.now() - WORK_DURATION * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        durationMinutes: 25,
        eventTitle: state.eventTitle,
        subtaskTitle: state.subtaskTitle,
        subtaskId: state.subtaskId,
        completed: true,
      };
      storage.savePomodoroSession(session);

      // Update subtask stats
      if (state.subtaskId) {
        useRoutinesStore.getState().recordPomodoroForSubtask(state.subtaskId, 25);
      }

      const newCount = state.pomodorosCompleted + 1;
      const nextPhaseIndex = state.currentPhaseIndex + 1;

      // Determine next phase
      if (nextPhaseIndex % POMODOROS_BEFORE_LONG_BREAK === 0) {
        set({
          phase: PomodoroPhase.longBreak,
          secondsRemaining: LONG_BREAK,
          pomodorosCompleted: newCount,
          currentPhaseIndex: nextPhaseIndex,
          running: true,
        });
      } else {
        set({
          phase: PomodoroPhase.shortBreak,
          secondsRemaining: SHORT_BREAK,
          pomodorosCompleted: newCount,
          currentPhaseIndex: nextPhaseIndex,
          running: true,
        });
      }
    } else {
      // Break completed, start new work phase
      set({
        phase: PomodoroPhase.work,
        secondsRemaining: WORK_DURATION,
        running: true,
      });
    }

    // Start timer
    const timer = setInterval(() => get()._tick(), 1000);
    set({_timer: timer});
    get()._scheduleNotification();
  },

  _scheduleNotification: () => {
    // TODO: Implement with @notifee/react-native
    // For now, this is a placeholder
  },

  start: (eventTitle, subtaskTitle = '', subtaskId = null) => {
    get()._resetTimer();

    set({
      phase: PomodoroPhase.work,
      secondsRemaining: WORK_DURATION,
      pomodorosCompleted: 0,
      eventTitle,
      subtaskTitle,
      subtaskId,
      currentPhaseIndex: 0,
      running: true,
    });

    const timer = setInterval(() => get()._tick(), 1000);
    set({_timer: timer});
    get()._scheduleNotification();
  },

  pause: () => {
    get()._resetTimer();
    set({running: false});
  },

  resume: () => {
    const state = get();
    if (state.phase !== PomodoroPhase.stopped) {
      set({running: true});
      const timer = setInterval(() => get()._tick(), 1000);
      set({_timer: timer});
    }
  },

  stop: () => {
    get()._resetTimer();
    set({
      phase: PomodoroPhase.stopped,
      secondsRemaining: 0,
      pomodorosCompleted: 0,
      currentPhaseIndex: 0,
    });
  },

  skipPhase: () => {
    const state = get();
    if (state.phase === PomodoroPhase.stopped) return;

    get()._resetTimer();

    if (state.phase === PomodoroPhase.work) {
      // Skip work -> go to break
      if ((state.currentPhaseIndex + 1) % POMODOROS_BEFORE_LONG_BREAK === 0) {
        set({
          phase: PomodoroPhase.longBreak,
          secondsRemaining: LONG_BREAK,
          currentPhaseIndex: state.currentPhaseIndex + 1,
        });
      } else {
        set({
          phase: PomodoroPhase.shortBreak,
          secondsRemaining: SHORT_BREAK,
          currentPhaseIndex: state.currentPhaseIndex + 1,
        });
      }
    } else {
      // Skip break -> go to work
      set({
        phase: PomodoroPhase.work,
        secondsRemaining: WORK_DURATION,
      });
    }

    set({running: true});
    const timer = setInterval(() => get()._tick(), 1000);
    set({_timer: timer});
  },
}));

// Helper functions
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getPhaseLabel(phase: PomodoroPhase): string {
  switch (phase) {
    case PomodoroPhase.work:
      return 'Work';
    case PomodoroPhase.shortBreak:
      return 'Short Break';
    case PomodoroPhase.longBreak:
      return 'Long Break';
    default:
      return 'Stopped';
  }
}