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
      {Array.from({length: cycleSize}, (_, i) => (
        <Text key={i} style={[styles.emoji, i < filled ? styles.filled : styles.empty, {color}]}>
          🍅
        </Text>
      ))}
    </View>
  );
}

const createStyles = ({spacing}: AppTheme) =>
  StyleSheet.create({
    row: {flexDirection: 'row', gap: spacing.sm, justifyContent: 'center'},
    emoji: {fontSize: 22},
    filled: {opacity: 1},
    empty: {opacity: 0.28},
  });
