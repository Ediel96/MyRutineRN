// src/components/pomodoro/EventContextCard.tsx
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme, AppTheme} from '../../theme/useTheme';

interface EventContextCardProps {
  phaseLabel: string;
  eventTitle?: string;
  categoryEmoji?: string;
  subtaskTitle?: string;
  textColor: string;
}

export function EventContextCard({phaseLabel, eventTitle, categoryEmoji, subtaskTitle, textColor}: EventContextCardProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  if (!eventTitle) {
    return null;
  }

  return (
    <View style={[styles.card, {backgroundColor: `${textColor}14`, borderColor: `${textColor}26`}]}>
      <Text style={[styles.phase, {color: `${textColor}B3`}]}>{phaseLabel}</Text>
      <Text style={[styles.title, {color: textColor}]} numberOfLines={1}>
        {categoryEmoji ? `${categoryEmoji} ` : ''}{eventTitle}
      </Text>
      {!!subtaskTitle && (
        <Text style={[styles.subtask, {color: `${textColor}CC`}]} numberOfLines={1}>
          → {subtaskTitle}
        </Text>
      )}
    </View>
  );
}

const createStyles = ({spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.lg,
      borderWidth: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
    },
    phase: {
      fontSize: typography.xs,
      fontWeight: typography.semibold,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    title: {fontSize: typography.lg, fontWeight: typography.bold},
    subtask: {fontSize: typography.sm, fontWeight: typography.medium},
  });
