// src/components/TodayEventRow.tsx
// Fila de rutina para TodayView - equivalente a Views/Today/TodayEventRow.swift

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import type {RoutineEvent, Subtask} from '../types';
import {EventCategory, TaskStatus} from '../types/enums';
import {
  EVENT_CATEGORY_CONFIG,
  TASK_STATUS_CONFIG,
} from '../types/enums';
import {useTheme, AppTheme} from '../theme/useTheme';
import {useRoutinesStore, getActiveSubtasks, getSubtasksProgress} from '../stores/routinesStore';
import {usePomodoroStore} from '../stores/pomodoroStore';

interface TodayEventRowProps {
  event: RoutineEvent;
}

type EventState = 'pending' | 'ongoing' | 'completed' | 'missed';

function getEventState(event: RoutineEvent, isCompleted: boolean): EventState {
  if (isCompleted) return 'completed';

  const now = new Date();
  const [startH, startM] = event.startTime.split(':').map(Number);
  const [endH, endM] = event.endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) return 'ongoing';
  if (nowMinutes > endMinutes) return 'missed';
  return 'pending';
}

export default function TodayEventRow({event}: TodayEventRowProps) {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {colors} = theme;
  const {toggleCompletedToday, isCompletedToday, calculateStreak, getSubtasksByEventId} =
    useRoutinesStore();

  const subtasks = getSubtasksByEventId(event.id);
  const activeSubtasks = getActiveSubtasks(subtasks);
  const progress = getSubtasksProgress(subtasks);
  const completed = isCompletedToday(event.id);
  const state = getEventState(event, completed);
  const streak = calculateStreak(event.id);

  const categoryConfig = EVENT_CATEGORY_CONFIG[event.categoryRaw as EventCategory];
  const isPomodoroSuitable = categoryConfig?.isPomodoroSuitable ?? false;

  const isActivePomodoro = usePomodoroStore(s => s.running && s.eventTitle === event.title);
  const hasSubtasks = activeSubtasks.length > 0;

  const handleToggle = () => {
    toggleCompletedToday(event.id);
  };

  const handlePress = () => {
    navigation.navigate('EventDetail', {eventId: event.id});
  };

  const handlePomodoro = () => {
    navigation.navigate('Pomodoro', {eventId: event.id});
  };

  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {borderLeftColor: categoryConfig?.color || colors.textTertiary},
        state === 'missed' && styles.missed,
        state === 'completed' && styles.completed,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}>
      {/* Check button */}
      <Pressable style={styles.checkButton} onPress={handleToggle} hitSlop={theme.hitSlop}>
        <View
          style={[
            styles.checkCircle,
            completed && styles.checkCircleFilled,
          ]}>
          {completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </Pressable>

      {/* Content */}
      <View style={styles.content}>
        {/* Time and now badge */}
        <View style={styles.timeRow}>
          <Text style={styles.time}>
            {event.startTime} · {event.endTime}
          </Text>
          {state === 'ongoing' && (
            <View style={styles.nowBadge}>
              <Text style={styles.nowBadgeText}>{t('common.now')}</Text>
            </View>
          )}
        </View>

        {/* Title with category emoji */}
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              completed && styles.titleCompleted,
            ]}>
            {categoryConfig?.emoji} {event.title}
          </Text>
          {event.alarmEnabled && <Text style={styles.alarmIcon}>🔔</Text>}
        </View>

        {/* Purpose */}
        {event.purpose && (
          <Text style={styles.purpose} numberOfLines={1}>
            {event.purpose}
          </Text>
        )}

        {/* Subtasks progress */}
        {subtasks.length > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {width: `${progress * 100}%`},
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {subtasks.filter(s => s.statusRaw === TaskStatus.done).length}/{subtasks.length}
            </Text>
          </View>
        )}

        {/* Streak */}
        {streak > 1 && (
          <Text style={styles.streak}>🔥 {streak}</Text>
        )}

        {/* Active Pomodoro indicator */}
        {isActivePomodoro && (
          <View style={styles.pomodoroIndicator}>
            <Text style={styles.pomodoroText}>
              🍅 {t('today.pomodoro_active')}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Expand/collapse subtasks */}
        {hasSubtasks && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setExpanded(!expanded)}
            hitSlop={theme.hitSlop}>
            <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        )}

        {/* Pomodoro button */}
        {isPomodoroSuitable && !completed && !hasSubtasks && (
          <TouchableOpacity
            style={styles.timerButton}
            onPress={handlePomodoro}
            hitSlop={theme.hitSlop}>
            <Text style={styles.timerIcon}>⏱</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Expanded subtasks */}
      {expanded && hasSubtasks && (
        <View style={styles.subtasksContainer}>
          {activeSubtasks.map(subtask => (
            <SubtaskRow
              key={subtask.id}
              subtask={subtask}
              eventId={event.id}
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

interface SubtaskRowProps {
  subtask: Subtask;
  eventId: string;
}

function SubtaskRow({subtask, eventId}: SubtaskRowProps) {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {advanceSubtaskStatus} = useRoutinesStore();
  const statusConfig = TASK_STATUS_CONFIG[subtask.statusRaw as TaskStatus];

  const handlePress = () => {
    if (subtask.statusRaw !== TaskStatus.done) {
      navigation.navigate('Pomodoro', {eventId, subtaskId: subtask.id});
    }
  };

  return (
    <Pressable style={styles.subtaskRow} onPress={handlePress}>
      <Text style={styles.subtaskEmoji}>{statusConfig.emoji}</Text>
      <Text style={styles.subtaskTitle}>{subtask.title}</Text>
      {subtask.pomodoroMinutes && (
        <Text style={styles.subtaskPom}>🍅{subtask.pomodoroMinutes}m</Text>
      )}
    </Pressable>
  );
}

const createStyles = ({colors, spacing, radius, typography, shadows}: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginHorizontal: spacing.lg,
      marginVertical: spacing.xs,
      borderLeftWidth: 4,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    missed: {
      opacity: 0.55,
    },
    completed: {
      backgroundColor: colors.surfaceAlt,
    },
    checkButton: {
      marginRight: spacing.md,
      justifyContent: 'center',
    },
    checkCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkCircleFilled: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    checkmark: {
      color: colors.background,
      fontSize: 16,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    time: {
      fontSize: typography.sm,
      color: colors.textSecondary,
    },
    nowBadge: {
      marginLeft: spacing.sm,
      backgroundColor: colors.accentWarm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.sm,
    },
    nowBadgeText: {
      color: colors.background,
      fontSize: typography.xs,
      fontWeight: typography.bold,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontSize: typography.lg,
      fontWeight: typography.semibold,
      color: colors.textPrimary,
      flex: 1,
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textTertiary,
    },
    alarmIcon: {
      marginLeft: spacing.xs,
      fontSize: typography.sm,
    },
    purpose: {
      fontSize: typography.sm + 1,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    progressBar: {
      flex: 1,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      marginRight: spacing.sm,
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.success,
      borderRadius: 2,
    },
    progressText: {
      fontSize: typography.xs + 1,
      color: colors.textSecondary,
    },
    streak: {
      fontSize: typography.sm,
      marginTop: spacing.xs,
    },
    pomodoroIndicator: {
      backgroundColor: colors.accentSecondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      marginTop: spacing.sm,
      alignSelf: 'flex-start',
    },
    pomodoroText: {
      color: colors.background,
      fontSize: typography.sm,
      fontWeight: typography.semibold,
    },
    actions: {
      justifyContent: 'center',
    },
    actionButton: {
      padding: spacing.sm,
    },
    chevron: {
      fontSize: typography.sm + 2,
      color: colors.textSecondary,
    },
    timerButton: {
      backgroundColor: colors.primary + '26',
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timerIcon: {
      fontSize: typography.lg,
    },
    subtasksContainer: {
      marginTop: spacing.md,
      paddingLeft: spacing.md,
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
    },
    subtaskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    subtaskEmoji: {
      fontSize: typography.lg,
      marginRight: spacing.sm,
    },
    subtaskTitle: {
      flex: 1,
      fontSize: typography.md,
      color: colors.textPrimary,
    },
    subtaskPom: {
      fontSize: typography.sm,
      color: colors.textSecondary,
    },
  });
