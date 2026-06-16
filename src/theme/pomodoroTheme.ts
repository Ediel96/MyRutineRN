// src/theme/pomodoroTheme.ts

export type PomodoroColorScheme = {
  background: string;
  backgroundCard: string;
  accent: string;
  accentMuted: string;
  textPrimary: string;
  textSecondary: string;
  ringTrack: string;
  buttonBg: string;
  buttonText: string;
  cardBorder: string;
  divider: string;
};

const dark = {
  work: {
    background:     '#0D0D0D',
    backgroundCard: 'rgba(255,255,255,0.06)',
    accent:         '#FF4D1A',
    accentMuted:    'rgba(255,77,26,0.15)',
    textPrimary:    '#FFFFFF',
    textSecondary:  '#999999',
    ringTrack:      'rgba(255,77,26,0.18)',
    buttonBg:       '#FF4D1A',
    buttonText:     '#FFFFFF',
    cardBorder:     'rgba(255,77,26,0.25)',
    divider:        '#1A1A1A',
  },
  shortBreak: {
    background:     '#0A0E14',
    backgroundCard: 'rgba(255,255,255,0.06)',
    accent:         '#4D94FF',
    accentMuted:    'rgba(77,148,255,0.15)',
    textPrimary:    '#FFFFFF',
    textSecondary:  '#666677',
    ringTrack:      'rgba(77,148,255,0.18)',
    buttonBg:       '#4D94FF',
    buttonText:     '#FFFFFF',
    cardBorder:     'rgba(77,148,255,0.25)',
    divider:        '#141A24',
  },
  longBreak: {
    background:     '#0A1208',
    backgroundCard: 'rgba(255,255,255,0.06)',
    accent:         '#4DCC6A',
    accentMuted:    'rgba(77,204,106,0.15)',
    textPrimary:    '#FFFFFF',
    textSecondary:  '#667766',
    ringTrack:      'rgba(77,204,106,0.18)',
    buttonBg:       '#4DCC6A',
    buttonText:     '#0A1208',
    cardBorder:     'rgba(77,204,106,0.25)',
    divider:        '#14200F',
  },
  stopped: {
    background:     '#0D0D0D',
    backgroundCard: 'rgba(255,255,255,0.04)',
    accent:         '#FF4D1A',
    accentMuted:    'rgba(255,77,26,0.10)',
    textPrimary:    '#444444',
    textSecondary:  '#333333',
    ringTrack:      '#1A1A1A',
    buttonBg:       '#FF4D1A',
    buttonText:     '#FFFFFF',
    cardBorder:     '#1A1A1A',
    divider:        '#1A1A1A',
  },
} as const;

const light = {
  work: {
    background:     '#FAFAFA',
    backgroundCard: 'rgba(0,0,0,0.04)',
    accent:         '#E03A0A',
    accentMuted:    'rgba(224,58,10,0.10)',
    textPrimary:    '#111111',
    textSecondary:  '#888888',
    ringTrack:      'rgba(224,58,10,0.15)',
    buttonBg:       '#E03A0A',
    buttonText:     '#FFFFFF',
    cardBorder:     'rgba(224,58,10,0.20)',
    divider:        '#EBEBEB',
  },
  shortBreak: {
    background:     '#F5F8FF',
    backgroundCard: 'rgba(0,0,0,0.04)',
    accent:         '#1A6FE0',
    accentMuted:    'rgba(26,111,224,0.10)',
    textPrimary:    '#111111',
    textSecondary:  '#888899',
    ringTrack:      'rgba(26,111,224,0.15)',
    buttonBg:       '#1A6FE0',
    buttonText:     '#FFFFFF',
    cardBorder:     'rgba(26,111,224,0.20)',
    divider:        '#D8E4F8',
  },
  longBreak: {
    background:     '#F5FBF5',
    backgroundCard: 'rgba(0,0,0,0.04)',
    accent:         '#1A8C35',
    accentMuted:    'rgba(26,140,53,0.10)',
    textPrimary:    '#111111',
    textSecondary:  '#668866',
    ringTrack:      'rgba(26,140,53,0.15)',
    buttonBg:       '#1A8C35',
    buttonText:     '#FFFFFF',
    cardBorder:     'rgba(26,140,53,0.20)',
    divider:        '#D0EDD4',
  },
  stopped: {
    background:     '#FAFAFA',
    backgroundCard: 'rgba(0,0,0,0.03)',
    accent:         '#E03A0A',
    accentMuted:    'rgba(224,58,10,0.08)',
    textPrimary:    '#CCCCCC',
    textSecondary:  '#DDDDDD',
    ringTrack:      '#EBEBEB',
    buttonBg:       '#E03A0A',
    buttonText:     '#FFFFFF',
    cardBorder:     '#EBEBEB',
    divider:        '#EBEBEB',
  },
} as const;

export const POMODORO_COLORS = {dark, light} as const;
export type PomodoroThemeMode = 'dark' | 'light';
export type PomodoroPhaseKey = 'work' | 'shortBreak' | 'longBreak' | 'stopped';
