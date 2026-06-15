// src/components/pomodoro/ProgressRing.tsx
// Anillo de progreso sin react-native-svg: pista circular + indicador que recorre el borde via rotate.
import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import {useTheme, AppTheme} from '../../theme/useTheme';

const SIZE = 200;
const THICKNESS = 10;
const DOT_SIZE = THICKNESS + 6;

interface ProgressRingProps {
  progress: number;
  emoji: string;
  timeLabel: string;
  color: string;
  trackColor: string;
}

export function ProgressRing({progress, emoji, timeLabel, color, trackColor}: ProgressRingProps) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const reducedMotion = useReducedMotion();
  const clamped = Math.min(Math.max(progress, 0), 1);
  const rotation = useSharedValue(clamped * 360);

  useEffect(() => {
    const target = clamped * 360;
    rotation.value = reducedMotion ? target : withTiming(target, {duration: 400});
  }, [clamped, reducedMotion, rotation]);

  const dotAnim = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value}deg`}],
  }));

  return (
    <View
      style={styles.wrapper}
      accessibilityRole="progressbar"
      accessibilityValue={{min: 0, max: 100, now: Math.round(clamped * 100)}}
      accessibilityLabel={timeLabel}>
      <View style={[styles.track, {borderColor: trackColor}]} />
      <Animated.View style={[styles.rotator, dotAnim]}>
        <View style={[styles.dot, {backgroundColor: color}]} />
      </Animated.View>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.timer, {color}]}>{timeLabel}</Text>
      </View>
    </View>
  );
}

const createStyles = ({typography}: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    track: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      borderWidth: THICKNESS,
    },
    rotator: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      marginTop: (THICKNESS - DOT_SIZE) / 2,
    },
    center: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    emoji: {fontSize: 40},
    timer: {fontSize: typography.display + 8, fontWeight: typography.extrabold},
  });
