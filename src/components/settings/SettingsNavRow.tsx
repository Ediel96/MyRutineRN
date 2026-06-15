// src/components/settings/SettingsNavRow.tsx
// Fila de navegación con ícono tintado, texto, badge opcional y chevron.

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Animated, {useSharedValue, useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {useTheme, AppTheme} from '../../theme/useTheme';

interface SettingsNavRowProps {
  icon: string;
  iconBg: string;
  label: string;
  badge?: string;
  showDivider?: boolean;
  onPress: () => void;
}

export function SettingsNavRow({icon, iconBg, label, badge, showDivider = true, onPress}: SettingsNavRowProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const bg = useSharedValue('transparent');
  const rowAnim = useAnimatedStyle(() => ({backgroundColor: bg.value}));

  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { bg.value = withTiming(theme.colors.surfaceAlt, {duration: 80}); }}
        onPressOut={() => { bg.value = withTiming('transparent', {duration: 200}); }}
        activeOpacity={1}
        accessibilityLabel={label}
        accessibilityRole="button">
        <Animated.View style={[styles.row, rowAnim]}>
          <View style={[styles.iconWrap, {backgroundColor: `${iconBg}26`}]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <Text style={styles.label}>{label}</Text>
          {badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
          <Text style={styles.chevron}>›</Text>
        </Animated.View>
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
      minHeight: 52,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    iconText: {fontSize: 17},
    label: {flex: 1, fontSize: typography.md, fontWeight: typography.medium, color: colors.textPrimary},
    badge: {
      backgroundColor: colors.error,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    badgeText: {fontSize: 10, fontWeight: typography.bold, color: colors.white},
    chevron: {fontSize: 20, color: colors.textTertiary, fontWeight: typography.bold},
    divider: {height: 0.5, backgroundColor: colors.border, marginHorizontal: spacing.md},
  });
