// src/components/pomodoro/TomatoCounter.tsx
import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme, AppTheme} from '../../theme/useTheme';

interface TomatoCounterProps {
  completed: number;
  cycleSize?: number;
  color: string;
}

export function TomatoCounter({completed, cycleSize = 4, color}: TomatoCounterProps) {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const filled = completed % cycleSize;

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={t('pomodoro.completed_count', {count: completed})}>
      {Array.from({length: cycleSize}, (_, i) => {
        const isFilled = i < filled;
        return (
          <View key={i} style={[styles.tomatoCol, isFilled ? styles.opaqueFull : styles.opaqueDim]}>
            <Text style={styles.emoji}>🍅</Text>
            {isFilled && <View style={[styles.dot, {backgroundColor: color}]} />}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = ({spacing}: AppTheme) =>
  StyleSheet.create({
    row: {flexDirection: 'row', gap: spacing.sm, justifyContent: 'center'},
    tomatoCol: {alignItems: 'center', gap: 3},
    emoji: {fontSize: 22},
    opaqueFull: {opacity: 1},
    opaqueDim: {opacity: 0.28},
    dot: {width: 4, height: 4, borderRadius: 2},
  });
