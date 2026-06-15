// src/screens/WeekScreen.tsx
import React, {useCallback, useEffect, useRef} from 'react';
import {Text, StyleSheet, FlatList} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import WeekDayCard from '../components/WeekDayCard';
import {ScreenContainer, SkeletonDayCard} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {TabScreenProps} from '../navigation/types';
import {WeekDay} from '../types/enums';
import type {RoutineEvent} from '../types';

const DAYS = [WeekDay.monday, WeekDay.tuesday, WeekDay.wednesday, WeekDay.thursday, WeekDay.friday, WeekDay.saturday, WeekDay.sunday];

type Props = TabScreenProps<'Week'>;

export default function WeekScreen({navigation}: Props) {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {loadData, isLoading, getEventsByDay} = useRoutinesStore();
  const listRef = useRef<FlatList<WeekDay>>(null);

  useEffect(() => { loadData(); }, [loadData]);

  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  useEffect(() => {
    if (isLoading || todayIndex <= 0) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({index: todayIndex, animated: true, viewPosition: 0.1});
    }, 300);
    return () => clearTimeout(timer);
  }, [isLoading, todayIndex]);

  const handlePressDay = useCallback((_day: WeekDay) => {
    navigation.navigate('Calendar');
  }, [navigation]);

  const handlePressEvent = useCallback((event: RoutineEvent) => {
    navigation.navigate('EventDetail', {eventId: event.id});
  }, [navigation]);

  const renderDay = useCallback(({item: day, index}: {item: WeekDay; index: number}) => (
    <WeekDayCard
      day={day}
      events={getEventsByDay(day)}
      isToday={index === todayIndex}
      onPressDay={handlePressDay}
      onPressEvent={handlePressEvent}
    />
  ), [getEventsByDay, todayIndex, handlePressDay, handlePressEvent]);

  const handleScrollToIndexFailed = useCallback((info: {averageItemLength: number; index: number}) => {
    listRef.current?.scrollToOffset({offset: info.averageItemLength * info.index, animated: true});
  }, []);

  return (
    <ScreenContainer>
      <Text style={styles.title}>{t('tabs.week')}</Text>

      {isLoading ? (
        <>
          <SkeletonDayCard />
          <SkeletonDayCard />
          <SkeletonDayCard />
          <SkeletonDayCard />
        </>
      ) : (
        <FlatList
          ref={listRef}
          data={DAYS}
          keyExtractor={day => day}
          renderItem={renderDay}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={handleScrollToIndexFailed}
        />
      )}
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, typography}: AppTheme) =>
  StyleSheet.create({
    title: {fontSize: typography.title, fontWeight: typography.bold, color: colors.textPrimary, padding: spacing.lg},
    listContent: {paddingTop: spacing.xs, paddingBottom: spacing.xxl},
  });
