// src/components/ui/SkeletonRow.tsx
// Loader animado para listas de eventos mientras cargan los datos.

import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {useTheme} from '../../theme/useTheme';

export default function SkeletonRow() {
  const {colors, spacing, radius} = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, {duration: 750}), -1, true);
  }, [opacity]);

  const anim = useAnimatedStyle(() => ({opacity: opacity.value}));

  return (
    <Animated.View style={[styles.card, {backgroundColor: colors.surface, borderRadius: radius.xl, marginHorizontal: spacing.lg, marginBottom: spacing.md}, anim]}>
      <View style={[styles.bar, {backgroundColor: colors.border}]} />
      <View style={[styles.content, {padding: spacing.md, gap: spacing.xs}]}>
        <View style={[styles.lineShort, {backgroundColor: colors.border, borderRadius: radius.sm}]} />
        <View style={[styles.lineLong, {backgroundColor: colors.surfaceAlt, borderRadius: radius.sm}]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {flexDirection: 'row', overflow: 'hidden', height: 72},
  bar: {width: 4, alignSelf: 'stretch'},
  content: {flex: 1, justifyContent: 'center'},
  lineShort: {height: 10, width: '35%'},
  lineLong: {height: 14, width: '65%'},
});
