// src/components/settings/ThemeSegmentedControl.tsx
// Selector de tema tipo segmented control (iOS-style) con gradiente en el botón activo.

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme, AppTheme} from '../../theme/useTheme';

interface Option<T> {
  value: T;
  label: string;
}

interface ThemeSegmentedControlProps<T extends string> {
  options: Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
  style?: ViewStyle;
}

export function ThemeSegmentedControl<T extends string>({options, selected, onSelect, style}: ThemeSegmentedControlProps<T>) {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.container, style]}>
      {options.map(opt => {
        const isActive = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.85}
            accessibilityLabel={opt.label}
            accessibilityRole="radio"
            accessibilityState={{selected: isActive}}
            style={styles.btnWrapper}>
            {isActive ? (
              <LinearGradient
                colors={[...theme.gradients.primary]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.btn}>
                <Text style={[styles.btnText, styles.btnTextActive]}>{opt.label}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.btn, styles.btnInactive]}>
                <Text style={styles.btnText}>{opt.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: radius.md,
      padding: 3,
      gap: 2,
    },
    btnWrapper: {flex: 1},
    btn: {
      paddingVertical: 7,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnInactive: {backgroundColor: 'transparent'},
    btnText: {fontSize: 12, fontWeight: typography.medium, color: colors.textTertiary},
    btnTextActive: {color: colors.white, fontWeight: typography.semibold},
  });
