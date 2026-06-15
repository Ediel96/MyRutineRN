// src/components/StatCard.tsx
// Card de métrica para StatsScreen: barra de acento + valor destacado en su color semántico.

import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useTheme, AppTheme} from '../theme/useTheme';

interface StatCardProps {
  emoji: string;
  value: string;
  label: string;
  sub: string;
  accentColor: string;
  index?: number;
}

export function StatCard({emoji, value, label, sub, accentColor, index = 0}: StatCardProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const reducedMotion = useReducedMotion();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    const delay = index * 80;
    if (reducedMotion) {
      opacity.value = withTiming(1, {duration: 0});
      translateY.value = withTiming(0, {duration: 0});
    } else {
      opacity.value = withDelay(delay, withTiming(1, {duration: 350}));
      translateY.value = withDelay(delay, withSpring(0, {damping: 18, stiffness: 200}));
    }
  }, [index, opacity, reducedMotion, translateY]);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{translateY: translateY.value}],
  }));

  return (
    <Animated.View
      style={[styles.wrapper, {backgroundColor: `${accentColor}1A`}, anim]}
      accessibilityLabel={`${label}: ${value} ${sub}`}>
      <View style={[styles.accentBar, {backgroundColor: accentColor}]} />
      <View style={styles.content}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.value, {color: accentColor}]}>{value}</Text>
        <Text style={styles.label} numberOfLines={2}>{label}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
    </Animated.View>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    accentBar: {
      height: 3,
    },
    content: {
      padding: spacing.md,
      paddingTop: spacing.sm,
      gap: 2,
    },
    emoji: {
      fontSize: 26,
      marginBottom: spacing.xs,
    },
    value: {
      fontSize: typography.display + 4,
      fontWeight: typography.bold,
      lineHeight: typography.display + 8,
    },
    label: {
      fontSize: typography.sm,
      fontWeight: typography.semibold,
      color: colors.textPrimary,
      marginTop: spacing.xs,
      lineHeight: 16,
    },
    sub: {
      fontSize: typography.xs,
      color: colors.textTertiary,
      lineHeight: 14,
    },
  });
