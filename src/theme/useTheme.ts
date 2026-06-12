// src/theme/useTheme.ts
// Hook central de tema: resuelve la paleta activa (oscuro por defecto) y expone
// todos los tokens del sistema de diseño a los componentes.

import {useColorScheme} from 'react-native';
import {useSettingsStore} from '../stores/settingsStore';
import {AppThemeMode} from '../types/enums';
import {
  darkColors,
  lightColors,
  gradients,
  spacing,
  borderRadius,
  typography,
  shadows,
  hitSlop,
  minTapSize,
  getCategoryColor,
} from './AppTheme';

export function useTheme() {
  const themeMode = useSettingsStore(s => s.theme);
  const systemScheme = useColorScheme();

  const isDark =
    themeMode === AppThemeMode.dark ||
    (themeMode === AppThemeMode.system && systemScheme !== 'light');

  const colors = isDark ? darkColors : lightColors;

  return {
    isDark,
    colors,
    gradients,
    spacing,
    radius: borderRadius,
    typography,
    shadows,
    hitSlop,
    minTapSize,
    getCategoryColor,
  };
}

export type AppTheme = ReturnType<typeof useTheme>;
