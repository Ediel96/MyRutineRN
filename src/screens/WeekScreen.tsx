// src/screens/WeekScreen.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Alert} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import WeekDayCard from '../components/WeekDayCard';
import {ScreenContainer, SkeletonDayCard, SkeletonRow, DayChips} from '../components/ui';
import {WEEK_ORDER} from '../components/ui/DayChips';
import {ThemeSegmentedControl} from '../components/settings';
import * as storage from '../services/storage';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {TabScreenProps} from '../navigation/types';
import {WeekDay, EventCategory, EVENT_CATEGORY_CONFIG} from '../types/enums';
import type {RoutineEvent} from '../types';

const DAYS = WEEK_ORDER;

type ViewMode = 'day' | 'routine';

/**
 * Una "rutina" agrupada: en el modelo de datos cada evento pertenece a UN solo
 * día (`dayRaw` es un string, no un array). Cuando en EventEditorScreen eliges
 * varios días, se crean varios eventos independientes, uno por día.
 *
 * Para el modo "Por rutina" hay que deshacer ese reparto. No existe un id que
 * enlace los eventos hermanos, así que se agrupan por los campos que el editor
 * copia identicos en todos ellos: título, horas y categoría.
 */
interface GroupedRoutine {
  key: string;
  title: string;
  emoji: string;
  startTime: string;
  endTime: string;
  days: WeekDay[];
  /** Evento representativo: al tocar la fila se abre su detalle. */
  eventId: string;
}

function groupEventsByRoutine(events: RoutineEvent[]): GroupedRoutine[] {
  const map = new Map<string, GroupedRoutine>();

  for (const event of events) {
    const key = `${event.title}|${event.startTime}|${event.endTime}|${event.categoryRaw}`;
    const day = event.dayRaw as WeekDay;
    const existing = map.get(key);

    if (existing) {
      if (!existing.days.includes(day)) existing.days.push(day);
      continue;
    }

    const config = EVENT_CATEGORY_CONFIG[event.categoryRaw as EventCategory];
    map.set(key, {
      key,
      title: event.title,
      emoji: config?.emoji ?? '',
      startTime: event.startTime,
      endTime: event.endTime,
      days: [day],
      eventId: event.id,
    });
  }

  // Días en orden lunes->domingo, y rutinas ordenadas por hora de inicio.
  const orderIndex = new Map(WEEK_ORDER.map((d, i) => [d, i]));
  return Array.from(map.values())
    .map(r => ({
      ...r,
      days: r.days.sort((a, b) => (orderIndex.get(a) ?? 0) - (orderIndex.get(b) ?? 0)),
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title));
}

type Props = TabScreenProps<'Week'>;

export default function WeekScreen({navigation}: Props) {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {loadData, isLoading, events, getEventsByDay, deleteAllRoutines} = useRoutinesStore();
  const listRef = useRef<FlatList<WeekDay>>(null);

  // Modo recordado entre sesiones (MMKV). Se lee de forma perezosa una sola vez.
  const [mode, setMode] = useState<ViewMode>(
    () => (storage.getWeekViewMode() === 'routine' ? 'routine' : 'day'),
  );

  const handleChangeMode = useCallback((next: ViewMode) => {
    setMode(next);
    storage.setWeekViewMode(next);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  // Auto-scroll al día actual: solo aplica al modo "Por día".
  useEffect(() => {
    if (mode !== 'day' || isLoading || todayIndex <= 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({index: todayIndex, animated: true, viewPosition: 0.1});
    }, 300);
    return () => clearTimeout(timer);
  }, [mode, isLoading, todayIndex]);

  const handlePressDay = useCallback(() => {
    navigation.navigate('Calendar');
  }, [navigation]);

  const handlePressEvent = useCallback(
    (event: RoutineEvent) => {
      navigation.navigate('EventDetail', {eventId: event.id});
    },
    [navigation],
  );

  const handlePressRoutine = useCallback(
    (eventId: string) => {
      navigation.navigate('EventDetail', {eventId});
    },
    [navigation],
  );

  const renderDay = useCallback(
    ({item: day, index}: {item: WeekDay; index: number}) => (
      <WeekDayCard
        day={day}
        events={getEventsByDay(day)}
        isToday={index === todayIndex}
        onPressDay={handlePressDay}
        onPressEvent={handlePressEvent}
      />
    ),
    [getEventsByDay, todayIndex, handlePressDay, handlePressEvent],
  );

  const routines = useMemo(() => groupEventsByRoutine(events), [events]);

  const renderRoutine = useCallback(
    ({item}: {item: GroupedRoutine}) => (
      <TouchableOpacity
        style={styles.routineCard}
        onPress={() => handlePressRoutine(item.eventId)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${item.startTime} - ${item.endTime}`}>
        <View style={styles.routineHeader}>
          <Text style={styles.routineTitle} numberOfLines={1}>
            {item.emoji ? `${item.emoji} ` : ''}
            {item.title}
          </Text>
          <Text style={styles.routineTime}>
            {item.startTime} – {item.endTime}
          </Text>
        </View>
        <DayChips days={item.days} size="sm" style={styles.routineDays} />
      </TouchableOpacity>
    ),
    [styles, handlePressRoutine],
  );

  // Borrado total. Doble confirmacion a proposito: es irreversible y la app no
  // tiene backend ni copia de seguridad, asi que no hay forma de recuperarlo.
  const handleDeleteAll = useCallback(() => {
    const count = events.length;
    Alert.alert(
      t('week.delete_all_title'),
      t('week.delete_all_message', {count, routines: routines.length}),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('week.delete_all_confirm'),
          style: 'destructive',
          onPress: () =>
            Alert.alert(t('week.delete_all_sure_title'), t('week.delete_all_sure_message'), [
              {text: t('common.cancel'), style: 'cancel'},
              {
                text: t('week.delete_all_confirm'),
                style: 'destructive',
                onPress: deleteAllRoutines,
              },
            ]),
        },
      ],
    );
  }, [t, events.length, routines.length, deleteAllRoutines]);

  const listFooter = useMemo(() => {
    if (routines.length === 0) return null;
    return (
      <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>⚠️  {t('week.danger_zone')}</Text>
        <Text style={styles.dangerHint}>{t('week.delete_all_hint')}</Text>
        <TouchableOpacity
          style={styles.dangerBtn}
          onPress={handleDeleteAll}
          accessibilityRole="button"
          accessibilityLabel={t('week.delete_all_title')}>
          <Text style={styles.dangerBtnText}>🗑  {t('week.delete_all_title')}</Text>
        </TouchableOpacity>
      </View>
    );
  }, [routines.length, styles, t, handleDeleteAll]);

  const handleScrollToIndexFailed = useCallback(
    (info: {averageItemLength: number; index: number}) => {
      listRef.current?.scrollToOffset({offset: info.averageItemLength * info.index, animated: true});
    },
    [],
  );

  const modeOptions = useMemo(
    () => [
      {value: 'day' as const, label: t('week.mode_by_day')},
      {value: 'routine' as const, label: t('week.mode_by_routine')},
    ],
    [t],
  );

  return (
    <ScreenContainer>
      <Text style={styles.title}>{t('tabs.week')}</Text>

      <ThemeSegmentedControl
        options={modeOptions}
        selected={mode}
        onSelect={handleChangeMode}
        style={styles.segmented}
      />

      {isLoading ? (
        <View style={styles.skeletons}>
          {mode === 'day' ? (
            <>
              <SkeletonDayCard />
              <SkeletonDayCard />
              <SkeletonDayCard />
              <SkeletonDayCard />
            </>
          ) : (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}
        </View>
      ) : mode === 'day' ? (
        <FlatList
          ref={listRef}
          data={DAYS}
          keyExtractor={day => day}
          renderItem={renderDay}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={handleScrollToIndexFailed}
        />
      ) : routines.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>{t('week.no_routines')}</Text>
          <Text style={styles.emptyMessage}>{t('week.no_routines_message')}</Text>
        </View>
      ) : (
        <FlatList
          data={routines}
          keyExtractor={r => r.key}
          renderItem={renderRoutine}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={listFooter}
        />
      )}
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography, shadows}: AppTheme) =>
  StyleSheet.create({
    title: {
      fontSize: typography.title,
      fontWeight: typography.bold,
      color: colors.textPrimary,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    segmented: {marginHorizontal: spacing.lg, marginBottom: spacing.md},
    skeletons: {flex: 1},
    listContent: {paddingTop: spacing.xs, paddingBottom: spacing.xxl},

    routineCard: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    routineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    routineTitle: {
      flex: 1,
      fontSize: typography.lg,
      fontWeight: typography.semibold,
      color: colors.textPrimary,
    },
    routineTime: {
      fontSize: typography.sm,
      fontWeight: typography.medium,
      color: colors.textSecondary,
    },
    routineDays: {justifyContent: 'flex-start'},

    // Mismo patrón de estado vacío que TodayScreen.
    emptyState: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80},
    emptyIcon: {fontSize: 64, marginBottom: spacing.lg},
    emptyTitle: {
      fontSize: typography.xxl,
      fontWeight: typography.semibold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    emptyMessage: {
      fontSize: typography.md,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.xxl,
    },

    // Zona de peligro: mismo lenguaje visual que la de SettingsScreen.
    dangerCard: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.error,
    },
    dangerTitle: {
      fontSize: typography.md,
      fontWeight: typography.semibold,
      color: colors.error,
      marginBottom: spacing.xs,
    },
    dangerHint: {
      fontSize: typography.sm,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    dangerBtn: {
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.error,
      alignItems: 'center',
    },
    dangerBtnText: {
      fontSize: typography.md,
      fontWeight: typography.semibold,
      color: colors.white,
    },
  });
