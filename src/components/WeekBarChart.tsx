// src/components/WeekBarChart.tsx
// Gráfico de barras semanal para StatsScreen: barras con gradiente, opacidad por
// pasado/futuro, resaltado del día actual y entrada animada escalonada.

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
import LinearGradient from 'react-native-linear-gradient';
import {useTranslation} from 'react-i18next';
import {useTheme, AppTheme} from '../theme/useTheme';

export interface WeekBarData {
  label: string;
  value: number;
  isToday: boolean;
  isPast: boolean;
}

interface WeekBarChartProps {
  data: WeekBarData[];
  title: string;
  period?: string;
  maxHeight?: number;
}

type Styles = ReturnType<typeof createStyles>;
type Theme = ReturnType<typeof useTheme>;

function AnimatedBar({bar, maxValue, maxHeight, index, reducedMotion, styles, theme}: {
  bar: WeekBarData;
  maxValue: number;
  maxHeight: number;
  index: number;
  reducedMotion: boolean;
  styles: Styles;
  theme: Theme;
}) {
  const {t} = useTranslation();
  const heightVal = useSharedValue(0);
  const targetHeight = maxValue > 0 ? Math.max(6, (bar.value / maxValue) * maxHeight) : 0;

  useEffect(() => {
    if (reducedMotion) {
      heightVal.value = withTiming(targetHeight, {duration: 0});
    } else {
      heightVal.value = withDelay(index * 60, withSpring(targetHeight, {damping: 16, stiffness: 180}));
    }
  }, [targetHeight, index, reducedMotion, heightVal]);

  const barAnimStyle = useAnimatedStyle(() => ({height: heightVal.value}));
  const opacity = bar.isPast || bar.isToday ? 1 : 0.35;

  return (
    <View
      style={styles.col}
      accessibilityLabel={`${bar.label}: ${bar.value} ${t('stats.routines_completed')}`}>
      {bar.value > 0 && <Text style={styles.barValue}>{bar.value}</Text>}
      <View style={[styles.barTrack, {height: maxHeight}]}>
        <Animated.View style={[styles.barAnimWrapper, barAnimStyle, {opacity}]}>
          <LinearGradient
            colors={[...theme.gradients.primary]}
            start={{x: 0, y: 0}}
            end={{x: 0, y: 1}}
            style={[styles.bar, bar.isToday && [styles.barToday, {borderColor: `${theme.colors.primary}80`}]]}
          />
        </Animated.View>
      </View>
      <Text style={[styles.label, bar.isToday && styles.labelToday]}>{bar.label}</Text>
    </View>
  );
}

export function WeekBarChart({data, title, period, maxHeight = 100}: WeekBarChartProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const reducedMotion = useReducedMotion();
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {period && <Text style={styles.period}>{period}</Text>}
      </View>
      <View style={styles.barsRow}>
        {data.map((bar, i) => (
          <AnimatedBar
            key={bar.label + i}
            bar={bar}
            maxValue={maxValue}
            maxHeight={maxHeight}
            index={i}
            reducedMotion={reducedMotion}
            styles={styles}
            theme={theme}
          />
        ))}
      </View>
    </View>
  );
}

const createStyles = ({colors, spacing, radius, typography, shadows}: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      ...shadows.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    title: {fontSize: typography.md, fontWeight: typography.bold, color: colors.textPrimary},
    period: {fontSize: typography.xs, color: colors.textTertiary, fontWeight: typography.medium},
    barsRow: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6},
    col: {flex: 1, alignItems: 'center', gap: 4},
    barValue: {fontSize: 9, fontWeight: typography.bold, color: colors.textTertiary},
    barTrack: {width: '100%', justifyContent: 'flex-end'},
    barAnimWrapper: {width: '100%', borderRadius: radius.sm, overflow: 'hidden'},
    bar: {width: '100%', height: '100%', borderRadius: radius.sm},
    barToday: {borderWidth: 1.5},
    label: {fontSize: 10, color: colors.textTertiary, fontWeight: typography.medium},
    labelToday: {color: colors.primary, fontWeight: typography.bold},
  });
