// src/components/ui/SkeletonDayCard.tsx
// Loader animado para las cards de WeekScreen mientras cargan los datos.

import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '../../theme/useTheme';

export default function SkeletonDayCard() {
  const {colors, spacing, radius} = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, {duration: 750}), -1, true);
  }, [opacity]);

  const anim = useAnimatedStyle(() => ({opacity: opacity.value}));

  return (
    <Animated.View
      style={[
        styles.card,
        {backgroundColor: colors.surface, borderRadius: radius.lg, marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md},
        anim,
      ]}>
      <View style={[styles.headerRow, {marginBottom: spacing.md}]}>
        <View style={[styles.titleLine, {backgroundColor: colors.border, borderRadius: radius.sm}]} />
        <View style={[styles.countLine, {backgroundColor: colors.surfaceAlt, borderRadius: radius.sm}]} />
      </View>
      <View style={[styles.eventLine, {backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, marginBottom: spacing.sm}]} />
      <View style={[styles.eventLine, styles.eventLineShort, {backgroundColor: colors.surfaceAlt, borderRadius: radius.sm}]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between'},
  titleLine: {height: 14, width: '30%'},
  countLine: {height: 12, width: '20%'},
  eventLine: {height: 11, width: '70%'},
  eventLineShort: {width: '55%'},
});
