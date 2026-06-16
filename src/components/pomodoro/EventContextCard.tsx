// src/components/pomodoro/EventContextCard.tsx
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme, AppTheme} from '../../theme/useTheme';

interface EventContextCardProps {
  phaseLabel: string;
  eventTitle?: string;
  categoryEmoji?: string;
  subtaskTitle?: string;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  accentColor?: string;
}

export function EventContextCard({
  phaseLabel,
  eventTitle,
  categoryEmoji,
  subtaskTitle,
  textColor = '#FFFFFF',
  bgColor,
  borderColor,
  accentColor,
}: EventContextCardProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  if (!eventTitle) {
    return null;
  }

  const bg = bgColor ?? `${textColor}14`;
  const border = borderColor ?? `${textColor}26`;
  const phaseColor = accentColor ?? `${textColor}B3`;
  const titleColor = textColor;
  const subtaskColor = `${textColor}CC`;

  return (
    <View style={[styles.card, {backgroundColor: bg, borderColor: border}]}>
      <Text style={[styles.phase, {color: phaseColor}]}>{phaseLabel}</Text>
      <Text style={[styles.title, {color: titleColor}]} numberOfLines={1}>
        {categoryEmoji ? `${categoryEmoji} ` : ''}{eventTitle}
      </Text>
      {!!subtaskTitle && (
        <Text style={[styles.subtask, {color: subtaskColor}]} numberOfLines={1}>
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
