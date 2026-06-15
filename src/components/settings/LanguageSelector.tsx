// src/components/settings/LanguageSelector.tsx
// Grid 2x2 de botones de idioma con nombre nativo y borde activo.

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useTheme, AppTheme} from '../../theme/useTheme';

interface LanguageOption<T extends string> {
  value: T;
  emoji: string;
  nativeName: string;
}

interface LanguageSelectorProps<T extends string> {
  options: LanguageOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

export function LanguageSelector<T extends string>({options, selected, onSelect}: LanguageSelectorProps<T>) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.grid}>
      {options.map(opt => {
        const isActive = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.8}
            accessibilityLabel={opt.nativeName}
            accessibilityRole="radio"
            accessibilityState={{selected: isActive}}
            style={[styles.btn, isActive && styles.btnActive]}>
            <Text style={styles.emoji}>{opt.emoji}</Text>
            <Text style={[styles.name, isActive && styles.nameActive]}>{opt.nativeName}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: spacing.md,
      gap: spacing.sm,
    },
    btn: {
      width: '47%',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: 'transparent',
      gap: spacing.xs,
    },
    btnActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}1A`,
    },
    emoji: {fontSize: 26},
    name: {fontSize: 11, color: colors.textSecondary, fontWeight: typography.medium},
    nameActive: {color: colors.primary, fontWeight: typography.semibold},
  });
