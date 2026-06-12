// src/theme/AppTheme.ts
// Sistema visual compartido - equivalente a Theme/AppTheme.swift

import {StyleSheet} from 'react-native';

export const colors = {
  // Primary
  primary: '#8B7FE8',
  primaryLight: '#A89EF0',
  primaryDark: '#6B5FC8',

  // Semantic
  success: '#34C28A',
  warning: '#F5A623',
  error: '#E8693F',
  info: '#4A9EE8',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',

  // Backgrounds
  backgroundLight: '#FAFAFA',
  backgroundDark: '#121212',
  surfaceLight: '#FFFFFF',
  surfaceDark: '#1E1E1E',

  // Text
  textPrimaryLight: '#212121',
  textSecondaryLight: '#757575',
  textPrimaryDark: '#FAFAFA',
  textSecondaryDark: '#BDBDBD',

  // Category colors
  gym: '#8B7FE8',
  code: '#34C28A',
  english: '#4A9EE8',
  cooking: '#F5A623',
  social: '#E8693F',
  work: '#9B9B92',
  rest: '#E66594',

  // Status
  todo: '#9E9E9E',
  doing: '#F5A623',
  done: '#34C28A',

  // Pomodoro
  workPhase: '#E8693F',
  shortBreakPhase: '#4A9EE8',
  longBreakPhase: '#34C28A',
};

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

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  // Font sizes
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

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const commonStyles = StyleSheet.create({
  // Containers
  screenContainer: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  cardElevated: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },

  // Text styles
  titleLarge: {
    fontSize: typography.title,
    fontWeight: typography.bold,
    color: colors.textPrimaryLight,
  },
  titleMedium: {
    fontSize: typography.xxl,
    fontWeight: typography.semibold,
    color: colors.textPrimaryLight,
  },
  titleSmall: {
    fontSize: typography.xl,
    fontWeight: typography.medium,
    color: colors.textPrimaryLight,
  },
  bodyLarge: {
    fontSize: typography.lg,
    fontWeight: typography.regular,
    color: colors.textPrimaryLight,
  },
  bodyMedium: {
    fontSize: typography.md,
    fontWeight: typography.regular,
    color: colors.textPrimaryLight,
  },
  bodySmall: {
    fontSize: typography.sm,
    fontWeight: typography.regular,
    color: colors.textSecondaryLight,
  },
  caption: {
    fontSize: typography.xs,
    fontWeight: typography.regular,
    color: colors.textSecondaryLight,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonText: {
    color: colors.white,
    fontSize: typography.md,
    fontWeight: typography.semibold,
  },
  buttonTextSecondary: {
    color: colors.primary,
    fontSize: typography.md,
    fontWeight: typography.semibold,
  },

  // Form elements
  input: {
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: typography.md,
    backgroundColor: colors.white,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  // Row styles
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowSpaceBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },

  // Flex helpers
  flex1: {flex: 1},
  flexGrow: {flexGrow: 1},
  flexShrink: {flexShrink: 1},

  // Spacing helpers
  mtXs: {marginTop: spacing.xs},
  mtSm: {marginTop: spacing.sm},
  mtMd: {marginTop: spacing.md},
  mtLg: {marginTop: spacing.lg},
  mtXl: {marginTop: spacing.xl},
  mbXs: {marginBottom: spacing.xs},
  mbSm: {marginBottom: spacing.sm},
  mbMd: {marginBottom: spacing.md},
  mbLg: {marginBottom: spacing.lg},
  mbXl: {marginBottom: spacing.xl},
  mxLg: {marginHorizontal: spacing.lg},
  myLg: {marginVertical: spacing.lg},
  pxLg: {paddingHorizontal: spacing.lg},
  pyMd: {paddingVertical: spacing.md},
  pyLg: {paddingVertical: spacing.lg},

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.md,
  },

  // Icon button
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.gray100,
  },
});

export const getCategoryColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    gym: colors.gym,
    code: colors.code,
    english: colors.english,
    cooking: colors.cooking,
    social: colors.social,
    work: colors.work,
    rest: colors.rest,
  };
  return colorMap[category] || colors.work;
};

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  commonStyles,
  getCategoryColor,
};