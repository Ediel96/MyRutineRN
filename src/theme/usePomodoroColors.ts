// src/theme/usePomodoroColors.ts
import {useMemo} from 'react';
import {useColorScheme} from 'react-native';
import {useSettingsStore} from '../stores/settingsStore';
import {POMODORO_COLORS, PomodoroColorScheme, PomodoroPhaseKey} from './pomodoroTheme';
import {PomodoroPhase, AppThemeMode} from '../types/enums';

const PHASE_TO_KEY: Record<PomodoroPhase, PomodoroPhaseKey> = {
  [PomodoroPhase.work]: 'work',
  [PomodoroPhase.shortBreak]: 'shortBreak',
  [PomodoroPhase.longBreak]: 'longBreak',
  [PomodoroPhase.stopped]: 'stopped',
};

export function usePomodoroColors(phase: PomodoroPhase): PomodoroColorScheme {
  const {theme: appTheme} = useSettingsStore();
  const systemScheme = useColorScheme();

  return useMemo(() => {
    let mode: 'dark' | 'light';
    if (appTheme === AppThemeMode.light) {
      mode = 'light';
    } else if (appTheme === AppThemeMode.dark) {
      mode = 'dark';
    } else {
      mode = systemScheme === 'light' ? 'light' : 'dark';
    }
    return POMODORO_COLORS[mode][PHASE_TO_KEY[phase]];
  }, [phase, appTheme, systemScheme]);
}
