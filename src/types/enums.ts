// src/types/enums.ts
// Enumeraciones de dominio - equivalente a Models/Enums.swift

export enum EventCategory {
  gym = 'gym',
  code = 'code',
  english = 'english',
  cooking = 'cooking',
  social = 'social',
  work = 'work',
  rest = 'rest',
}

export const EVENT_CATEGORY_CONFIG: Record<
  EventCategory,
  {emoji: string; color: string; isPomodoroSuitable: boolean; displayName: string}
> = {
  [EventCategory.gym]: {
    emoji: '💪',
    color: '#8B7FE8',
    isPomodoroSuitable: true,
    displayName: 'Gym',
  },
  [EventCategory.code]: {
    emoji: '💻',
    color: '#34C28A',
    isPomodoroSuitable: true,
    displayName: 'Code',
  },
  [EventCategory.english]: {
    emoji: '🇬🇧',
    color: '#4A9EE8',
    isPomodoroSuitable: true,
    displayName: 'English',
  },
  [EventCategory.cooking]: {
    emoji: '🍳',
    color: '#F5A623',
    isPomodoroSuitable: false,
    displayName: 'Cooking',
  },
  [EventCategory.social]: {
    emoji: '🎉',
    color: '#E8693F',
    isPomodoroSuitable: false,
    displayName: 'Social',
  },
  [EventCategory.work]: {
    emoji: '💼',
    color: '#9B9B92',
    isPomodoroSuitable: true,
    displayName: 'Work',
  },
  [EventCategory.rest]: {
    emoji: '😴',
    color: '#E66594',
    isPomodoroSuitable: false,
    displayName: 'Rest',
  },
};

export enum WeekDay {
  sunday = 'sunday',
  monday = 'monday',
  tuesday = 'tuesday',
  wednesday = 'wednesday',
  thursday = 'thursday',
  friday = 'friday',
  saturday = 'saturday',
}

export const WEEKDAY_CONFIG: Record<
  WeekDay,
  {iOSWeekday: number; shortName: string; displayName: string}
> = {
  [WeekDay.sunday]: {iOSWeekday: 1, shortName: 'Sun', displayName: 'Sunday'},
  [WeekDay.monday]: {iOSWeekday: 2, shortName: 'Mon', displayName: 'Monday'},
  [WeekDay.tuesday]: {iOSWeekday: 3, shortName: 'Tue', displayName: 'Tuesday'},
  [WeekDay.wednesday]: {
    iOSWeekday: 4,
    shortName: 'Wed',
    displayName: 'Wednesday',
  },
  [WeekDay.thursday]: {iOSWeekday: 5, shortName: 'Thu', displayName: 'Thursday'},
  [WeekDay.friday]: {iOSWeekday: 6, shortName: 'Fri', displayName: 'Friday'},
  [WeekDay.saturday]: {
    iOSWeekday: 7,
    shortName: 'Sat',
    displayName: 'Saturday',
  },
};

export enum TaskStatus {
  todo = 'todo',
  doing = 'doing',
  done = 'done',
}

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  {emoji: string; displayName: string}
> = {
  [TaskStatus.todo]: {emoji: '⭕', displayName: 'Pending'},
  [TaskStatus.doing]: {emoji: '🟡', displayName: 'In Progress'},
  [TaskStatus.done]: {emoji: '✅', displayName: 'Completed'},
};

export enum PomodoroPhase {
  work = 'work',
  shortBreak = 'shortBreak',
  longBreak = 'longBreak',
  stopped = 'stopped',
}

export const POMODORO_PHASE_CONFIG: Record<
  PomodoroPhase,
  {emoji: string; durationMinutes: number; displayName: string}
> = {
  [PomodoroPhase.work]: {emoji: '🍅', durationMinutes: 25, displayName: 'Work'},
  [PomodoroPhase.shortBreak]: {
    emoji: '☕',
    durationMinutes: 5,
    displayName: 'Short Break',
  },
  [PomodoroPhase.longBreak]: {
    emoji: '🌴',
    durationMinutes: 15,
    displayName: 'Long Break',
  },
  [PomodoroPhase.stopped]: {emoji: '⏸️', durationMinutes: 0, displayName: 'Stopped'},
};

export enum AppLanguage {
  system = 'system',
  english = 'english',
  spanish = 'spanish',
  french = 'french',
}

export const APP_LANGUAGE_CONFIG: Record<
  AppLanguage,
  {bundle: string; displayName: string; emoji: string}
> = {
  [AppLanguage.system]: {bundle: '', displayName: 'System', emoji: '📱'},
  [AppLanguage.english]: {bundle: 'en', displayName: 'English', emoji: '🇬🇧'},
  [AppLanguage.spanish]: {bundle: 'es', displayName: 'Español', emoji: '🇪🇸'},
  [AppLanguage.french]: {bundle: 'fr', displayName: 'Français', emoji: '🇫🇷'},
};

export enum AIParserErrorType {
  missingAPIKey = 'missingAPIKey',
  transcriptionFailed = 'transcriptionFailed',
  parsingFailed = 'parsingFailed',
  networkError = 'networkError',
  invalidJSON = 'invalidJSON',
  unknownProvider = 'unknownProvider',
}

export enum AppThemeMode {
  light = 'light',
  dark = 'dark',
  system = 'system',
}

export enum CreatorStage {
  idle = 'idle',
  recording = 'recording',
  processing = 'processing',
  preview = 'preview',
  error = 'error',
}

export enum MasteryLevel {
  beginner = 'beginner',
  intermediate = 'intermediate',
  advanced = 'advanced',
  expert = 'expert',
  master = 'master',
}

export const MASTERY_LEVEL_CONFIG: Record<
  MasteryLevel,
  {emoji: string; displayName: string; minPomodoros: number}
> = {
  [MasteryLevel.beginner]: {emoji: '🌱', displayName: 'Beginner', minPomodoros: 0},
  [MasteryLevel.intermediate]: {
    emoji: '🌿',
    displayName: 'Intermediate',
    minPomodoros: 5,
  },
  [MasteryLevel.advanced]: {emoji: '🌳', displayName: 'Advanced', minPomodoros: 20},
  [MasteryLevel.expert]: {emoji: '⭐', displayName: 'Expert', minPomodoros: 50},
  [MasteryLevel.master]: {emoji: '🏆', displayName: 'Master', minPomodoros: 100},
};

export enum LogLevel {
  debug = 'debug',
  info = 'info',
  warning = 'warning',
  error = 'error',
  critical = 'critical',
}

export enum ViewMode {
  board = 'board',
  list = 'list',
}