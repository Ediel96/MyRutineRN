// src/screens/CalendarScreen.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {
  CalendarContainer,
  CalendarBody,
  type CalendarKitHandle,
  type EventItem,
  type OnEventResponse,
  type PackedEvent,
} from '@howljs/calendar-kit';
import {useRoutinesStore} from '../stores/routinesStore';
import {ScreenContainer} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {TabScreenProps} from '../navigation/types';
import {WeekDay, EventCategory, EVENT_CATEGORY_CONFIG} from '../types/enums';

type Props = TabScreenProps<'Calendar'>;

const WEEKDAY_BY_INDEX: WeekDay[] = [
  WeekDay.sunday,
  WeekDay.monday,
  WeekDay.tuesday,
  WeekDay.wednesday,
  WeekDay.thursday,
  WeekDay.friday,
  WeekDay.saturday,
];

const SHORT_WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const INDEX_BY_WEEKDAY: Record<string, number> = WEEKDAY_BY_INDEX.reduce(
  (acc, day, index) => ({...acc, [day]: index}),
  {} as Record<string, number>,
);

// How many weeks before/after today the recurring routine events are materialized into.
const WEEKS_RANGE = 8;

const pad = (n: number) => n.toString().padStart(2, '0');
const toLocalISODate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Parses a "YYYY-MM-DD..." date string as a local date, avoiding UTC-shift off-by-one.
const parseLocalDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(value);
};

const getWeekDates = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = start.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  start.setDate(start.getDate() + diffToMonday);
  return Array.from({length: 7}, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
};

export default function CalendarScreen({}: Props) {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {loadData, events, subtasks, updateEvent} = useRoutinesStore();
  const calendarRef = useRef<CalendarKitHandle>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(today);

  useEffect(() => { loadData(); }, []);

  const {minDate, maxDate} = useMemo(() => {
    const min = new Date();
    min.setDate(min.getDate() - WEEKS_RANGE * 7);
    const max = new Date();
    max.setDate(max.getDate() + WEEKS_RANGE * 7);
    return {minDate: min, maxDate: max};
  }, []);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Recurring routines repeat weekly on `dayRaw`, so any day matching that weekday has events.
  const daysWithEvents = useMemo(() => new Set(events.map(e => e.dayRaw)), [events]);

  const subtaskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    subtasks.forEach(s => {
      if (s.eventId && !s.archivedAt) counts[s.eventId] = (counts[s.eventId] ?? 0) + 1;
    });
    return counts;
  }, [subtasks]);

  // Routine events recur weekly on `dayRaw` - materialize one instance per visible week so the
  // calendar can display & drag concrete dated occurrences.
  const calendarEvents = useMemo<EventItem[]>(() => {
    const items: EventItem[] = [];
    for (let week = -WEEKS_RANGE; week <= WEEKS_RANGE; week++) {
      for (const event of events) {
        const dayIndex = INDEX_BY_WEEKDAY[event.dayRaw];
        if (dayIndex === undefined) continue;
        const date = new Date(today);
        date.setDate(date.getDate() + (dayIndex - today.getDay()) + week * 7);
        const dateStr = toLocalISODate(date);
        const config = EVENT_CATEGORY_CONFIG[event.categoryRaw as EventCategory];
        items.push({
          id: `${event.id}::${dateStr}`,
          start: {dateTime: `${dateStr}T${event.startTime}:00`},
          end: {dateTime: `${dateStr}T${event.endTime}:00`},
          title: event.title,
          color: theme.getCategoryColor(event.categoryRaw),
          routineEventId: event.id,
          emoji: config?.emoji ?? '',
          subtasksCount: subtaskCounts[event.id] ?? 0,
        });
      }
    }
    return items;
  }, [events, subtaskCounts, theme, today]);

  // Dragging an occurrence reschedules the whole recurring routine (its weekly day/time).
  const handleDragEventEnd = useCallback((event: OnEventResponse) => {
    const routineEventId = event.routineEventId as string | undefined;
    const startISO = event.start.dateTime;
    const endISO = event.end.dateTime;
    if (!routineEventId || !startISO || !endISO) return;
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    updateEvent(routineEventId, {
      dayRaw: WEEKDAY_BY_INDEX[startDate.getDay()],
      startTime: `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
      endTime: `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`,
    });
  }, [updateEvent]);

  // Tapping a day pill jumps the single-day timeline to that date.
  const handleSelectDay = useCallback((date: Date) => {
    setSelectedDate(date);
    calendarRef.current?.goToDate({date, animatedDate: true});
  }, []);

  // Swiping the timeline left/right keeps the day strip in sync with the visible date.
  const handleDateChange = useCallback((dateStr: string) => {
    const date = parseLocalDate(dateStr);
    setSelectedDate(prev => (isSameDay(prev, date) ? prev : date));
  }, []);

  const renderEvent = useCallback((event: PackedEvent) => {
    const startTime = event.start.dateTime?.slice(11, 16);
    const endTime = event.end.dateTime?.slice(11, 16);
    const color = event.color ?? theme.colors.primary;
    return (
      <View style={[styles.eventCard, {backgroundColor: `${color}26`, borderLeftColor: color}]}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {event.emoji ? `${event.emoji} ` : ''}{event.title}
        </Text>
        <Text style={styles.eventTime}>{startTime} - {endTime}</Text>
        {event.subtasksCount > 0 && (
          <Text style={styles.eventTasks}>{t('calendar.tasks_count', {count: event.subtasksCount})}</Text>
        )}
      </View>
    );
  }, [styles, t, theme.colors.primary]);

  const initialLocales = useMemo(() => {
    const weekDayShort = SHORT_WEEKDAY_KEYS.map(d => t(`weekdays.${d}`));
    return {en: {weekDayShort}, es: {weekDayShort}, fr: {weekDayShort}};
  }, [t]);

  const calendarTheme = useMemo(() => ({
    colors: {
      primary: theme.colors.primary,
      onPrimary: theme.colors.white,
      background: theme.colors.background,
      onBackground: theme.colors.textPrimary,
      border: theme.colors.border,
      text: theme.colors.textPrimary,
      surface: theme.colors.surfaceAlt,
      onSurface: theme.colors.textSecondary,
    },
  }), [theme]);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.subtitle}>{t('calendar.drag_hint')}</Text>
        <Text style={styles.title}>{t('tabs.calendar')}</Text>
      </View>
      <View style={styles.dayStrip}>
        {weekDates.map(date => {
          const dayIndex = date.getDay();
          const weekDay = WEEKDAY_BY_INDEX[dayIndex];
          const selected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const hasEvents = daysWithEvents.has(weekDay);
          return (
            <Pressable
              key={toLocalISODate(date)}
              style={[styles.dayCell, selected && styles.dayCellSelected]}
              onPress={() => handleSelectDay(date)}>
              <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>
                {t(`weekdays.${SHORT_WEEKDAY_KEYS[dayIndex]}`)}
              </Text>
              <View style={[styles.dayNumberWrap, isToday && !selected && styles.dayNumberToday]}>
                <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>{date.getDate()}</Text>
              </View>
              <View style={[styles.dayDot, hasEvents && (selected ? styles.dayDotSelected : styles.dayDotVisible)]} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.calendarWrapper}>
        <CalendarContainer
          ref={calendarRef}
          events={calendarEvents}
          minDate={minDate}
          maxDate={maxDate}
          initialDate={today}
          numberOfDays={1}
          firstDay={1}
          start={300}
          end={1380}
          timeInterval={60}
          timeIntervalHeight={90}
          initialTimeIntervalHeight={90}
          minTimeIntervalHeight={70}
          allowPinchToZoom
          allowDragToEdit
          dragStep={15}
          scrollToNow
          theme={calendarTheme}
          locale={i18n.language}
          initialLocales={initialLocales}
          onDragEventEnd={handleDragEventEnd}
          onChange={handleDateChange}>
          <CalendarBody renderEvent={renderEvent} />
        </CalendarContainer>
      </View>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    header: {paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm},
    subtitle: {fontSize: typography.sm, color: colors.textTertiary, marginBottom: spacing.xxs},
    title: {fontSize: typography.title, fontWeight: typography.bold, color: colors.textPrimary},
    dayStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.xs,
      marginHorizontal: spacing.xxs,
      borderRadius: radius.lg,
    },
    dayCellSelected: {backgroundColor: colors.primary},
    dayLabel: {fontSize: typography.xs, color: colors.textTertiary, marginBottom: spacing.xxs},
    dayLabelSelected: {color: colors.white},
    dayNumberWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNumberToday: {borderWidth: 1.5, borderColor: colors.primary},
    dayNumber: {fontSize: typography.md, fontWeight: typography.semibold, color: colors.textPrimary},
    dayNumberSelected: {color: colors.white},
    dayDot: {width: 5, height: 5, borderRadius: 2.5, marginTop: spacing.xxs, opacity: 0},
    dayDotVisible: {opacity: 1, backgroundColor: colors.primary},
    dayDotSelected: {opacity: 1, backgroundColor: colors.white},
    calendarWrapper: {flex: 1},
    eventCard: {flex: 1, borderRadius: radius.md, borderLeftWidth: 3, paddingHorizontal: spacing.xs, paddingVertical: 1, overflow: 'hidden'},
    eventTitle: {fontSize: typography.xs, fontWeight: typography.semibold, color: colors.textPrimary},
    eventTime: {fontSize: typography.xs, color: colors.textSecondary},
    eventTasks: {fontSize: typography.xs, color: colors.textTertiary},
  });
