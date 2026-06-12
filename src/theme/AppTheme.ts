// src/theme/AppTheme.ts
// Sistema de diseño centralizado: tokens de color, tipografía, espaciado y radios.
// Tema oscuro es el predeterminado de la app (ver useTheme.ts).

import {StyleSheet} from 'react-native';

// ============ Brand palette (constante en ambos temas) ============
export const brand = {
  gradientStart: '#6C7FE0', // azul violeta
  gradientEnd: '#8B5CB8', // púrpura
  accentWarm: '#FCE08A', // amarillo pastel - highlights/badges
  accentSecondary: '#FFAE7A', // naranja durazno - notificaciones/secundario
  accentAI: '#5B7FFF', // azul brillante - IA/asistente
  deepPurple: '#4B2E83', // texto/contraste fuerte (modo claro)
  boneWhite: '#F8F7FC', // superficie clara
};

// ============ Dark theme (predeterminado) ============
export const darkColors = {
  background: '#14121F',
  backgroundAlt: '#1A1729',
  surface: '#231F35',
  surfaceAlt: '#2A2440',
  border: '#3A3450',

  textPrimary: '#F5F3FA',
  textSecondary: '#A6A0C2',
  textTertiary: '#6E6890',

  primary: brand.gradientStart,
  primaryAlt: brand.gradientEnd,
  accentWarm: brand.accentWarm,
  accentSecondary: brand.accentSecondary,
  accentAI: brand.accentAI,

  success: brand.accentAI,
  warning: brand.accentWarm,
  notify: brand.accentSecondary,
  error: '#FF7A7A',
  info: brand.accentAI,

  white: brand.boneWhite,
  overlay: 'rgba(10, 9, 18, 0.6)',

  // texto oscuro de alto contraste sobre fondos claros (ej. gradiente cálido)
  textAccent: brand.deepPurple,
};

// ============ Light theme (opcional vía Settings) ============
export const lightColors = {
  background: brand.boneWhite,
  backgroundAlt: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EDF7',
  border: '#E3DFF0',

  textPrimary: '#2A2440',
  textSecondary: '#756F94',
  textTertiary: '#A6A0C2',

  primary: brand.gradientStart,
  primaryAlt: brand.gradientEnd,
  accentWarm: brand.accentWarm,
  accentSecondary: brand.accentSecondary,
  accentAI: brand.accentAI,

  success: brand.accentAI,
  warning: brand.accentWarm,
  notify: brand.accentSecondary,
  error: '#E0533D',
  info: brand.accentAI,

  white: '#FFFFFF',
  overlay: 'rgba(43, 36, 64, 0.4)',
  textAccent: brand.deepPurple,
};

export type ThemeColors = typeof darkColors;

// ============ Gradientes ============
export const gradients = {
  primary: [brand.gradientStart, brand.gradientEnd] as const,
  warm: [brand.accentWarm, brand.accentSecondary] as const,
  ai: [brand.accentAI, brand.gradientStart] as const,
};

// ============ Espaciado ============
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// ============ Radios (estilo amigable, muy redondeado) ============
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};

// ============ Tipografía ============
export const typography = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 32,
  title: 28,
  headline: 22,

  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// ============ Sombras ============
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
};

// ============ Tap targets (accesibilidad) ============
export const hitSlop = {top: 8, bottom: 8, left: 8, right: 8};
export const minTapSize = 44;

// ============ Categorías (alineadas a la paleta de marca) ============
export const getCategoryColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    gym: brand.gradientStart,
    code: '#34C28A',
    english: '#4A9EE8',
    cooking: brand.accentSecondary,
    social: '#E8693F',
    work: '#9B95B5',
    rest: '#E66594',
  };
  return colorMap[category] || colorMap.work;
};

// ============ Estilos comunes "legacy" (tema oscuro fijo) ============
// Mantener para compatibilidad puntual; preferir useTheme() en pantallas nuevas.
export const commonStyles = StyleSheet.create({
  flex1: {flex: 1},
  row: {flexDirection: 'row', alignItems: 'center'},
  rowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default {
  brand,
  darkColors,
  lightColors,
  gradients,
  spacing,
  borderRadius,
  typography,
  shadows,
  commonStyles,
  getCategoryColor,
};
