// src/components/WeekDayCard.tsx
// Card de día para WeekScreen: nombre del día, conteo de eventos y lista de eventos.

import React from 'react';
import {View, Text, StyleSheet, Pressable, TouchableOpacity} from 'react-native';
import Animated, {useSharedValue, useAnimatedStyle, withSpring} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import {useTranslation} from 'react-i18next';
import type {RoutineEvent} from '../types';
import {WeekDay, EventCategory, EVENT_CATEGORY_CONFIG} from '../types/enums';
import {useTheme, AppTheme} from '../theme/useTheme';

interface WeekDayCardProps {
  day: WeekDay;
  events: RoutineEvent[];
  isToday: boolean;
  onPressDay: (day: WeekDay) => void;
  onPressEvent: (event: RoutineEvent) => void;
}

export default function WeekDayCard({day, events, isToday, onPressDay, onPressEvent}: WeekDayCardProps) {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {colors, gradients} = theme;

  const scale = useSharedValue(1);
  const cardAnimStyle = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));

  const sortedEvents = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const countLabel = events.length === 0
    ? t('week.no_events')
    : t('week.event_count', {count: events.length});

  return (
    <Pressable
      onPress={() => onPressDay(day)}
      onPressIn={() => { scale.value = withSpring(0.98, {damping: 20}); }}
      onPressOut={() => { scale.value = withSpring(1, {damping: 20}); }}
      accessibilityLabel={`${t(`weekdays.${day}`)}, ${countLabel}`}
      accessibilityRole="button"
      style={styles.pressable}>
      <Animated.View style={[styles.card, isToday && styles.cardToday, cardAnimStyle]}>
        {/* Barra gradiente izquierda - solo día actual */}
        {isToday && (
          <LinearGradient
            colors={[...gradients.primary]}
            start={{x: 0, y: 0}}
            end={{x: 0, y: 1}}
            style={styles.accentBar}
          />
        )}

        {/* Header: nombre del día + conteo */}
        <View style={[styles.cardTop, isToday && styles.cardTopIndent]}>
          <View style={styles.dayNameRow}>
            <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
              {t(`weekdays.${day}`)}
            </Text>
            {isToday && (
              <LinearGradient
                colors={[...gradients.primary]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.todayPill}>
                <Text style={styles.todayPillText}>{t('week.today_badge')}</Text>
              </LinearGradient>
            )}
          </View>
          <Text style={[styles.eventCount, events.length === 0 && styles.eventCountEmpty]}>
            {countLabel}
          </Text>
        </View>

        {/* Contenido */}
        <View style={isToday ? styles.eventsIndent : undefined}>
          {sortedEvents.length === 0 ? (
            <Text style={styles.emptyLabel}>{t('week.free_day')}</Text>
          ) : (
            sortedEvents.map((event, index) => {
              const categoryConfig = EVENT_CATEGORY_CONFIG[event.categoryRaw as EventCategory];
              return (
                <View
                  key={event.id}
                  style={[styles.eventRow, index < sortedEvents.length - 1 && styles.eventRowBorder]}>
                  {/* Dot de color de categoría */}
                  <View style={[styles.dot, {backgroundColor: categoryConfig?.color ?? colors.primary}]} />

                  {/* Hora */}
                  <Text style={styles.eventTime}>{event.startTime}</Text>

                  {/* Emoji */}
                  {categoryConfig?.emoji ? (
                    <Text style={styles.eventEmoji}>{categoryConfig.emoji}</Text>
                  ) : null}

                  {/* Nombre */}
                  <Text style={styles.eventName} numberOfLines={1}>
                    {event.title}
                  </Text>

                  {/* Chevron para ir al detalle */}
                  <TouchableOpacity
                    onPress={() => onPressEvent(event)}
                    hitSlop={theme.hitSlop}
                    accessibilityLabel={event.title}
                    accessibilityRole="button">
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const createStyles = ({colors, spacing, radius, typography, shadows}: AppTheme) =>
  StyleSheet.create({
    pressable: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      overflow: 'hidden',
      ...shadows.sm,
    },
    cardToday: {
      backgroundColor: colors.surfaceAlt,
      shadowColor: colors.primary,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.2,
      shadowRadius: 14,
      elevation: 6,
    },
    accentBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    cardTopIndent: {paddingLeft: spacing.sm},
    dayNameRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    dayName: {
      fontSize: typography.lg,
      fontWeight: typography.bold,
      color: colors.textPrimary,
    },
    dayNameToday: {color: colors.white},
    todayPill: {
      borderRadius: radius.full,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    todayPillText: {
      fontSize: typography.xs - 1,
      fontWeight: typography.bold,
      color: colors.white,
      letterSpacing: 0.4,
    },
    eventCount: {
      fontSize: typography.sm,
      fontWeight: typography.medium,
      color: colors.textSecondary,
    },
    eventCountEmpty: {color: colors.textTertiary},
    eventsIndent: {paddingLeft: spacing.sm},
    eventRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    eventRowBorder: {
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      flexShrink: 0,
    },
    eventTime: {
      fontSize: typography.xs,
      fontWeight: typography.medium,
      color: colors.textSecondary,
      width: 40,
      flexShrink: 0,
      letterSpacing: 0.2,
    },
    eventEmoji: {fontSize: 13},
    eventName: {
      flex: 1,
      fontSize: typography.sm,
      fontWeight: typography.medium,
      color: colors.textPrimary,
    },
    chevron: {
      fontSize: 18,
      color: colors.textTertiary,
      fontWeight: typography.bold,
      paddingLeft: 4,
    },
    emptyLabel: {
      fontSize: typography.xs,
      color: colors.textTertiary,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: spacing.sm,
    },
  });
