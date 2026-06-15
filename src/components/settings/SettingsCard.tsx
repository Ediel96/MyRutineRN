// src/components/settings/SettingsCard.tsx
// Wrapper de sección para SettingsScreen: título de sección + separador + contenido.

import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {useTheme, AppTheme} from '../../theme/useTheme';

interface SettingsCardProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
  titleColor?: string;
}

export function SettingsCard({title, children, style, titleColor}: SettingsCardProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.card, style]}>
      <Text style={[styles.sectionTitle, titleColor ? {color: titleColor} : null]}>
        {title}
      </Text>
      <View style={styles.divider} />
      {children}
    </View>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    sectionTitle: {
      fontSize: typography.xs,
      fontWeight: typography.semibold,
      color: colors.textTertiary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    divider: {
      height: 0.5,
      backgroundColor: colors.border,
      marginHorizontal: spacing.md,
    },
  });
