// src/components/TodayEventRow.tsx
// Fila de rutina para TodayView - equivalente a Views/Today/TodayEventRow.swift

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import HapticFeedback from 'react-native-haptic-feedback';
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

// Ancho de cada botón de acción del swipe (icono + etiqueta)
const ACTION_WIDTH = 72;
const LEFT_ACTIONS_WIDTH = ACTION_WIDTH * 2; // Alarma + Pomodoro
const RIGHT_ACTIONS_WIDTH = ACTION_WIDTH * 2; // Editar + Eliminar

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
  const {colors, spacing} = theme;
  const {toggleCompletedToday, isCompletedToday, calculateStreak, getSubtasksByEventId, updateEvent, deleteEvent} =
    useRoutinesStore();

  const subtasks = getSubtasksByEventId(event.id);
  const activeSubtasks = getActiveSubtasks(subtasks);
  const progress = getSubtasksProgress(subtasks);
  const completed = isCompletedToday(event.id);
  const state = getEventState(event, completed);
  const streak = calculateStreak(event.id);

  const categoryConfig = EVENT_CATEGORY_CONFIG[event.categoryRaw as EventCategory];

  const isActivePomodoro = usePomodoroStore(s => s.running && s.eventTitle === event.title);
  const hasSubtasks = activeSubtasks.length > 0;

  const handleToggle = () => {
    HapticFeedback.trigger('impactLight', {enableVibrateFallback: true, ignoreAndroidSystemSettings: false});
    toggleCompletedToday(event.id);
  };

  const scale = useSharedValue(1);
  const rowAnimStyle = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));

  const checkScale = useSharedValue(completed ? 1 : 0);
  useEffect(() => {
    checkScale.value = withSpring(completed ? 1 : 0, {damping: 12});
  }, [completed, checkScale]);
  const checkAnimStyle = useAnimatedStyle(() => ({transform: [{scale: checkScale.value}]}));

  // ===== Swipe horizontal (Gesture.Pan) =====
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const closeRow = () => {
    translateX.value = withSpring(0, {damping: 18, stiffness: 200});
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate(e => {
      const next = startX.value + e.translationX;
      translateX.value = Math.max(-RIGHT_ACTIONS_WIDTH, Math.min(LEFT_ACTIONS_WIDTH, next));
    })
    .onEnd(() => {
      if (translateX.value > ACTION_WIDTH) {
        translateX.value = withSpring(LEFT_ACTIONS_WIDTH, {damping: 18, stiffness: 200});
      } else if (translateX.value < -ACTION_WIDTH) {
        translateX.value = withSpring(-RIGHT_ACTIONS_WIDTH, {damping: 18, stiffness: 200});
      } else {
        translateX.value = withSpring(0, {damping: 18, stiffness: 200});
      }
    });

  const translateStyle = useAnimatedStyle(() => ({
    transform: [{translateX: translateX.value}],
  }));

  // ===== Colapso animado al eliminar =====
  const measuredHeight = useSharedValue(0);
  const collapseProgress = useSharedValue(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    if (collapseProgress.value === 0) {
      measuredHeight.value = e.nativeEvent.layout.height;
    }
  };

  const collapseStyle = useAnimatedStyle(() => ({
    height: measuredHeight.value > 0 ? measuredHeight.value * (1 - collapseProgress.value) : undefined,
    opacity: 1 - collapseProgress.value,
    marginVertical: spacing.xs * (1 - collapseProgress.value),
  }));

  const handlePress = () => {
    if (translateX.value !== 0) {
      closeRow();
      return;
    }
    navigation.navigate('EventDetail', {eventId: event.id});
  };

  const handleAlarm = () => {
    closeRow();
    updateEvent(event.id, {alarmEnabled: !event.alarmEnabled});
  };

  const handlePomodoro = () => {
    closeRow();
    navigation.navigate('Pomodoro', {eventId: event.id});
  };

  const handleEdit = () => {
    closeRow();
    navigation.navigate('EventEditor', {eventId: event.id});
  };

  const handleDelete = () => {
    Alert.alert(
      t('routine.delete'),
      t('routine.delete_confirm'),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            translateX.value = withSpring(0, {damping: 18, stiffness: 200});
            collapseProgress.value = withTiming(1, {duration: 250}, finished => {
              if (finished) {
                runOnJS(deleteEvent)(event.id);
              }
            });
          },
        },
      ],
    );
  };

  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View style={[styles.collapseWrapper, collapseStyle]} onLayout={handleLayout}>
      <View style={styles.rowWrapper}>
        {/* Swipe derecha → Alarma + Pomodoro */}
        <View style={styles.leftActions}>
          <SwipeActionButton
            icon="🔔"
            label={t('routine.alarm')}
            backgroundColor={colors.accentWarm}
            onPress={handleAlarm}
            theme={theme}
          />
          <SwipeActionButton
            icon="⏱"
            label={t('pomodoro.title')}
            backgroundColor={colors.accentSecondary}
            onPress={handlePomodoro}
            theme={theme}
          />
        </View>

        {/* Swipe izquierda → Editar + Eliminar */}
        <View style={styles.rightActions}>
          <SwipeActionButton
            icon="✏️"
            label={t('common.edit')}
            backgroundColor={colors.primary}
            onPress={handleEdit}
            theme={theme}
          />
          <SwipeActionButton
            icon="🗑"
            label={t('common.delete')}
            backgroundColor={colors.error}
            onPress={handleDelete}
            theme={theme}
          />
        </View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={translateStyle}>
            <Animated.View style={rowAnimStyle}>
              <TouchableOpacity
                style={[
                  styles.container,
                  {borderLeftColor: categoryConfig?.color || colors.textTertiary},
                  state === 'missed' && styles.missed,
                  state === 'completed' && styles.completed,
                ]}
                onPress={handlePress}
                onPressIn={() => { scale.value = withSpring(0.97); }}
                onPressOut={() => { scale.value = withSpring(1); }}
                activeOpacity={0.7}>
                {/* Check button */}
                <Pressable style={styles.checkButton} onPress={handleToggle} hitSlop={theme.hitSlop}>
                  <View
                    style={[
                      styles.checkCircle,
                      completed && styles.checkCircleBorder,
                    ]}>
                    <Animated.View style={[styles.checkFill, checkAnimStyle]} />
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

                {/* Expand/collapse subtasks */}
                {hasSubtasks && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setExpanded(!expanded)}
                      hitSlop={theme.hitSlop}>
                      <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

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
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

interface SwipeActionButtonProps {
  icon: string;
  label: string;
  backgroundColor: string;
  onPress: () => void;
  theme: AppTheme;
}

function SwipeActionButton({icon, label, backgroundColor, onPress, theme}: SwipeActionButtonProps) {
  const styles = createStyles(theme);
  const textColor = backgroundColor === theme.colors.accentWarm ? theme.colors.textAccent : theme.colors.white;
  return (
    <TouchableOpacity
      style={[styles.swipeActionButton, {backgroundColor}]}
      onPress={onPress}
      activeOpacity={0.8}>
      <Text style={styles.swipeActionIcon}>{icon}</Text>
      <Text style={[styles.swipeActionLabel, {color: textColor}]} numberOfLines={1}>
        {label}
      </Text>
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

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    collapseWrapper: {
      marginHorizontal: spacing.lg,
    },
    rowWrapper: {
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    leftActions: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: LEFT_ACTIONS_WIDTH,
      flexDirection: 'row',
    },
    rightActions: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: RIGHT_ACTIONS_WIDTH,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    swipeActionButton: {
      width: ACTION_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swipeActionIcon: {
      fontSize: typography.lg,
      marginBottom: spacing.xxs,
    },
    swipeActionLabel: {
      fontSize: typography.xs,
      fontWeight: typography.semibold,
      color: colors.white,
    },
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderLeftWidth: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    missed: {
      backgroundColor: colors.surfaceAlt,
      borderLeftColor: colors.warning,
    },
    completed: {
      backgroundColor: colors.surfaceAlt,
      borderLeftColor: colors.success,
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
      overflow: 'hidden',
    },
    checkCircleBorder: {
      borderColor: colors.success,
    },
    checkFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 14,
      backgroundColor: colors.success,
    },
    checkmark: {
      color: colors.white,
      fontSize: 16,
      fontWeight: typography.bold,
      zIndex: 1,
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
      color: colors.textAccent,
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
      color: colors.textAccent,
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
