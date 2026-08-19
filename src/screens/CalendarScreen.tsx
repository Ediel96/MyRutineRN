// src/screens/CalendarScreen.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  AppState,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  CalendarContainer,
  CalendarBody,
  type CalendarKitHandle,
  type EventItem,
  type OnEventResponse,
  type PackedEvent,
  type SizeAnimation,
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

// Cuántas semanas antes/después de hoy se materializan las rutinas recurrentes.
const WEEKS_RANGE = 8;

// Ventana horaria por defecto cuando no hay eventos de los que deducirla.
const FALLBACK_START_HOUR = 6;
const FALLBACK_END_HOUR = 23;

const HAPTIC_OPTIONS = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
};

const pad = (n: number) => n.toString().padStart(2, '0');
const toLocalISODate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// Interpreta "YYYY-MM-DD..." como fecha local, evitando el desfase de un día por UTC.
const parseLocalDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
};

const getWeekDates = (date: Date) => {
  const start = startOfDay(date);
  const dow = start.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  start.setDate(start.getDate() + diffToMonday);
  return Array.from(
    {length: 7},
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
};

const addDays = (date: Date, days: number) => {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
};

// "HH:MM" -> minutos desde medianoche. Devuelve null si el formato no encaja.
const timeToMinutes = (value?: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? '');
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
};

// Etiqueta "agosto 2026". Intl puede no estar disponible en algunas builds de
// Hermes, así que caemos a un formato numérico antes que romper la pantalla.
const formatMonthYear = (date: Date, locale: string) => {
  try {
    const label = date.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return `${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }
};

// ---------------------------------------------------------------------------
// Bloque de evento del timeline.
// Alterna densidad según la altura que le asigna calendar-kit: `size.height` es
// un SharedValue de Reanimated, de ahí el useAnimatedStyle.
// ---------------------------------------------------------------------------
type EventBlockProps = {
  event: PackedEvent;
  size: SizeAnimation;
  styles: ReturnType<typeof createStyles>;
  defaultColor: string;
  tasksLabel: (count: number) => string;
};

const EventBlockView = ({
  event,
  size,
  styles,
  defaultColor,
  tasksLabel,
}: EventBlockProps) => {
  const startTime = event.start.dateTime?.slice(11, 16) ?? '';
  const endTime = event.end.dateTime?.slice(11, 16) ?? '';
  const color = event.color ?? defaultColor;
  const subtasksCount = (event.subtasksCount as number) ?? 0;

  const timeStyle = useAnimatedStyle(() => ({
    opacity: size.height.value >= 44 ? 1 : 0,
  }));
  const tasksStyle = useAnimatedStyle(() => ({
    opacity: size.height.value >= 74 ? 1 : 0,
  }));

  return (
    <View
      style={[styles.eventCard, {backgroundColor: `${color}26`, borderLeftColor: color}]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${startTime} a ${endTime}${
        subtasksCount > 0 ? `, ${tasksLabel(subtasksCount)}` : ''
      }`}>
      <Text style={styles.eventTitle} numberOfLines={1}>
        {event.emoji ? `${event.emoji} ` : ''}
        {event.title}
      </Text>
      <Animated.Text style={[styles.eventTime, timeStyle]} numberOfLines={1}>
        {startTime} – {endTime}
      </Animated.Text>
      {subtasksCount > 0 && (
        <Animated.Text style={[styles.eventTasks, tasksStyle]} numberOfLines={1}>
          {tasksLabel(subtasksCount)}
        </Animated.Text>
      )}
    </View>
  );
};
EventBlockView.displayName = 'EventBlock';

// Memoizado: calendar-kit vuelve a llamar a renderEvent en cada scroll/zoom.
const EventBlock = React.memo(EventBlockView);

// ---------------------------------------------------------------------------

export default function CalendarScreen({}: Props) {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const {width} = useWindowDimensions();

  // StyleSheet.create es caro y su resultado solo depende del tema. Sin este
  // memo se recreaba en cada render, lo que invalidaba `renderEvent` y forzaba
  // a calendar-kit a repintar todos los eventos continuamente.
  const styles = useMemo(() => createStyles(theme), [theme]);

  const {loadData, events, subtasks, updateEvent} = useRoutinesStore();
  const calendarRef = useRef<CalendarKitHandle>(null);

  // "Hoy" se recalcula al volver la app a primer plano: si el móvil pasa la
  // noche en el bolsillo, un valor fijado al montar se queda en el día anterior.
  const [today, setToday] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      const now = startOfDay(new Date());
      setToday(prev => (isSameDay(prev, now) ? prev : now));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const {minDate, maxDate} = useMemo(
    () => ({
      minDate: addDays(today, -WEEKS_RANGE * 7),
      maxDate: addDays(today, WEEKS_RANGE * 7),
    }),
    [today],
  );

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const isOnToday = isSameDay(selectedDate, today);

  // Las rutinas se repiten cada semana en `dayRaw`, así que cualquier fecha que
  // caiga en ese día de la semana tiene eventos.
  const daysWithEvents = useMemo(
    () => new Set(events.map(e => e.dayRaw)),
    [events],
  );

  const subtaskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    subtasks.forEach(s => {
      if (s.eventId && !s.archivedAt) {
        counts[s.eventId] = (counts[s.eventId] ?? 0) + 1;
      }
    });
    return counts;
  }, [subtasks]);

  // Ventana horaria visible, deducida de los eventos reales.
  // Antes estaba fija en 05:00–23:00, así que una rutina a las 04:30 o a las
  // 23:30 simplemente no se veía.
  const {startMinutes, endMinutes} = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const event of events) {
      const s = timeToMinutes(event.startTime);
      const e = timeToMinutes(event.endTime);
      if (s !== null) min = Math.min(min, s);
      if (e !== null) max = Math.max(max, e);
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return {
        startMinutes: FALLBACK_START_HOUR * 60,
        endMinutes: FALLBACK_END_HOUR * 60,
      };
    }
    // Una hora de margen a cada lado, redondeando a la hora en punto.
    return {
      startMinutes: Math.max(0, Math.floor(min / 60) * 60 - 60),
      endMinutes: Math.min(24 * 60, Math.ceil(max / 60) * 60 + 60),
    };
  }, [events]);

  // Las rutinas recurren semanalmente en `dayRaw`: materializamos una instancia
  // por semana visible para que el calendario muestre ocurrencias con fecha
  // concreta y se puedan arrastrar.
  const calendarEvents = useMemo<EventItem[]>(() => {
    const items: EventItem[] = [];
    for (let week = -WEEKS_RANGE; week <= WEEKS_RANGE; week++) {
      for (const event of events) {
        const dayIndex = INDEX_BY_WEEKDAY[event.dayRaw];
        if (dayIndex === undefined) continue;
        const date = addDays(today, dayIndex - today.getDay() + week * 7);
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

  const hasEventsOnSelectedDay = useMemo(() => {
    const weekDay = WEEKDAY_BY_INDEX[selectedDate.getDay()];
    return daysWithEvents.has(weekDay);
  }, [daysWithEvents, selectedDate]);

  // Arrastrar una ocurrencia reprograma la rutina recurrente entera.
  const handleDragEventEnd = useCallback(
    (event: OnEventResponse) => {
      const routineEventId = event.routineEventId as string | undefined;
      const startISO = event.start.dateTime;
      const endISO = event.end.dateTime;
      if (!routineEventId || !startISO || !endISO) return;
      const startDate = new Date(startISO);
      const endDate = new Date(endISO);
      ReactNativeHapticFeedback.trigger('impactMedium', HAPTIC_OPTIONS);
      updateEvent(routineEventId, {
        dayRaw: WEEKDAY_BY_INDEX[startDate.getDay()],
        startTime: `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`,
        endTime: `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`,
      });
    },
    [updateEvent],
  );

  const goToDate = useCallback((date: Date) => {
    setSelectedDate(date);
    calendarRef.current?.goToDate({date, animatedDate: true});
  }, []);

  const handleSelectDay = useCallback(
    (date: Date) => {
      ReactNativeHapticFeedback.trigger('selection', HAPTIC_OPTIONS);
      goToDate(date);
    },
    [goToDate],
  );

  const handleShiftWeek = useCallback(
    (direction: -1 | 1) => {
      ReactNativeHapticFeedback.trigger('selection', HAPTIC_OPTIONS);
      goToDate(addDays(selectedDate, direction * 7));
    },
    [goToDate, selectedDate],
  );

  const handleGoToToday = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactLight', HAPTIC_OPTIONS);
    goToDate(today);
  }, [goToDate, today]);

  // Deslizar el timeline mantiene sincronizada la tira de días.
  const handleDateChange = useCallback((dateStr: string) => {
    const date = parseLocalDate(dateStr);
    setSelectedDate(prev => (isSameDay(prev, date) ? prev : date));
  }, []);

  const tasksLabel = useCallback(
    (count: number) => t('calendar.tasks_count', {count}),
    [t],
  );

  const renderEvent = useCallback(
    (event: PackedEvent, size: SizeAnimation) => (
      <EventBlock
        event={event}
        size={size}
        styles={styles}
        defaultColor={theme.colors.primary}
        tasksLabel={tasksLabel}
      />
    ),
    [styles, tasksLabel, theme.colors.primary],
  );

  const nowIndicator = useMemo(
    () => (
      <View style={styles.nowIndicator} pointerEvents="none">
        <View style={styles.nowIndicatorLine} />
        <View style={styles.nowIndicatorDot} />
      </View>
    ),
    [styles],
  );

  const renderCustomHorizontalLine = useCallback(
    () => <View style={styles.hourLine} />,
    [styles],
  );

  const initialLocales = useMemo(() => {
    const weekDayShort = SHORT_WEEKDAY_KEYS.map(d => t(`weekdays.${d}`));
    return {en: {weekDayShort}, es: {weekDayShort}, fr: {weekDayShort}};
  }, [t]);

  const calendarTheme = useMemo(
    () => ({
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
      hourBackgroundColor: theme.colors.background,
      hourBorderColor: theme.colors.surfaceAlt,
      hourTextStyle: {
        fontSize: theme.typography.xs,
        fontWeight: theme.typography.medium,
        color: theme.colors.textTertiary,
      },
      nowIndicatorColor: theme.colors.error,
    }),
    [theme],
  );

  // La celda crece con la pantalla pero nunca baja del mínimo táctil accesible.
  const daySize = useMemo(() => {
    const available = width - theme.spacing.md * 2;
    return Math.max(theme.minTapSize, Math.min(56, available / 7 - theme.spacing.xs));
  }, [width, theme.spacing.md, theme.spacing.xs, theme.minTapSize]);

  const monthLabel = useMemo(
    () => formatMonthYear(selectedDate, i18n.language),
    [selectedDate, i18n.language],
  );

  return (
    <ScreenContainer>
      {/* Cabecera: título y acceso rápido a hoy */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('tabs.calendar')}</Text>
        {!isOnToday && (
          <Pressable
            style={({pressed}) => [styles.todayButton, pressed && styles.pressed]}
            onPress={handleGoToToday}
            hitSlop={theme.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={t('calendar.go_to_today')}>
            <Text style={styles.todayButtonText}>{t('calendar.today')}</Text>
          </Pressable>
        )}
      </View>

      {/* Mes visible + navegación semanal */}
      <View style={styles.monthRow}>
        <Pressable
          style={({pressed}) => [styles.navButton, pressed && styles.pressed]}
          onPress={() => handleShiftWeek(-1)}
          hitSlop={theme.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.prev_week')}>
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel} numberOfLines={1}>
          {monthLabel}
        </Text>
        <Pressable
          style={({pressed}) => [styles.navButton, pressed && styles.pressed]}
          onPress={() => handleShiftWeek(1)}
          hitSlop={theme.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={t('calendar.next_week')}>
          <Text style={styles.navButtonText}>›</Text>
        </Pressable>
      </View>

      {/* Tira de días de la semana */}
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
              style={({pressed}) => [
                styles.dayCell,
                {width: daySize},
                selected && styles.dayCellSelected,
                pressed && !selected && styles.pressed,
              ]}
              onPress={() => handleSelectDay(date)}
              accessibilityRole="button"
              accessibilityLabel={`${t(`weekdays.${weekDay}`)} ${date.getDate()}`}
              accessibilityState={{selected}}>
              {selected && (
                <LinearGradient
                  colors={[...theme.gradients.primary]}
                  start={{x: 0, y: 0}}
                  end={{x: 0, y: 1}}
                  style={[StyleSheet.absoluteFill, styles.dayCellGradient]}
                />
              )}
              <Text
                style={[styles.dayLabel, selected && styles.dayLabelSelected]}
                numberOfLines={1}>
                {t(`weekdays.${SHORT_WEEKDAY_KEYS[dayIndex]}`)}
              </Text>
              <View
                style={[
                  styles.dayNumberWrap,
                  isToday && !selected && styles.dayNumberToday,
                ]}>
                <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>
                  {date.getDate()}
                </Text>
              </View>
              <View
                style={[
                  styles.dayDot,
                  hasEvents && (selected ? styles.dayDotSelected : styles.dayDotVisible),
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Timeline */}
      <View style={styles.calendarWrapper}>
        <CalendarContainer
          ref={calendarRef}
          events={calendarEvents}
          minDate={minDate}
          maxDate={maxDate}
          initialDate={today}
          numberOfDays={1}
          firstDay={1}
          start={startMinutes}
          end={endMinutes}
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
          <CalendarBody
            renderEvent={renderEvent}
            NowIndicatorComponent={nowIndicator}
            renderCustomHorizontalLine={renderCustomHorizontalLine}
          />
        </CalendarContainer>

        {/* Estado vacío: superpuesto para no desmontar el timeline */}
        {!hasEventsOnSelectedDay && (
          <View style={styles.emptyState} pointerEvents="none">
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t('calendar.empty_title')}</Text>
              <Text style={styles.emptyMessage}>{t('calendar.empty_message')}</Text>
            </View>
          </View>
        )}
      </View>

      {/* La pista de arrastre solo tiene sentido si hay algo que arrastrar */}
      {hasEventsOnSelectedDay && (
        <Text style={styles.dragHint} numberOfLines={1}>
          {t('calendar.drag_hint')}
        </Text>
      )}
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography, shadows}: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    title: {
      fontSize: typography.display,
      fontWeight: typography.extrabold,
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    todayButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    todayButtonText: {
      fontSize: typography.sm,
      fontWeight: typography.semibold,
      color: colors.primary,
    },
    pressed: {opacity: 0.6},

    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    monthLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: typography.lg,
      fontWeight: typography.semibold,
      color: colors.textSecondary,
    },
    navButton: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    navButtonText: {
      fontSize: typography.xxl,
      lineHeight: Platform.OS === 'ios' ? 26 : 28,
      fontWeight: typography.semibold,
      color: colors.textSecondary,
    },

    dayStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    dayCell: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    dayCellSelected: {
      ...shadows.md,
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
    },
    dayCellGradient: {borderRadius: radius.lg},
    dayLabel: {
      fontSize: typography.xs,
      fontWeight: typography.medium,
      color: colors.textTertiary,
      marginBottom: spacing.xxs,
      textTransform: 'uppercase',
    },
    dayLabelSelected: {color: colors.white},
    dayNumberWrap: {
      width: 30,
      height: 30,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayNumberToday: {borderWidth: 1.5, borderColor: colors.primary},
    dayNumber: {
      fontSize: typography.lg,
      fontWeight: typography.semibold,
      color: colors.textPrimary,
    },
    dayNumberSelected: {color: colors.white},
    dayDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      marginTop: spacing.xxs,
      opacity: 0,
    },
    dayDotVisible: {opacity: 1, backgroundColor: colors.primary},
    dayDotSelected: {opacity: 1, backgroundColor: colors.white},

    calendarWrapper: {flex: 1},

    eventCard: {
      flex: 1,
      borderRadius: radius.md,
      borderLeftWidth: 3,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      overflow: 'hidden',
    },
    eventTitle: {
      fontSize: typography.sm,
      fontWeight: typography.semibold,
      color: colors.textPrimary,
    },
    eventTime: {
      fontSize: typography.xs,
      fontWeight: typography.medium,
      color: colors.textSecondary,
      marginTop: 1,
    },
    eventTasks: {
      fontSize: typography.xs,
      color: colors.textTertiary,
      marginTop: 1,
    },

    nowIndicator: {flex: 1},
    nowIndicatorLine: {
      position: 'absolute',
      top: -0.75,
      left: 0,
      right: 0,
      height: 1.5,
      backgroundColor: colors.error,
      opacity: 0.85,
    },
    nowIndicatorDot: {
      position: 'absolute',
      top: -5,
      left: -5,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.error,
    },
    hourLine: {height: StyleSheet.hairlineWidth, width: '100%', backgroundColor: colors.border},

    emptyState: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxxl,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.xxl,
      alignItems: 'center',
      ...shadows.md,
    },
    emptyTitle: {
      fontSize: typography.lg,
      fontWeight: typography.bold,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    emptyMessage: {
      fontSize: typography.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },

    dragHint: {
      fontSize: typography.xs,
      color: colors.textTertiary,
      textAlign: 'center',
      paddingVertical: spacing.sm,
    },
  });
