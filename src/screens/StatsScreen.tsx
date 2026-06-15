// src/screens/StatsScreen.tsx
import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {ScreenContainer, SkeletonRow} from '../components/ui';
import {StatCard} from '../components/StatCard';
import {WeekBarChart, type WeekBarData} from '../components/WeekBarChart';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {TabScreenProps} from '../navigation/types';
import * as storage from '../services/storage';

type Props = TabScreenProps<'Stats'>;

const SHORT_WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function StatsScreen({}: Props) {
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {loadData, isLoading, completions} = useRoutinesStore();

  useEffect(() => { loadData(); }, [loadData]);

  const sessions = storage.getAllPomodoroSessions();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyCompletions = completions.filter(c => new Date(c.date) >= weekAgo);
  const totalPomodoros = sessions.length;

  // Color semántico por métrica.
  const STAT_COLORS = {
    completed: '#4ADE80',
    pomodoro: '#FF6B6B',
    weekly: theme.colors.primary,
    streak: theme.colors.accentSecondary,
  };

  const statCards = [
    {
      emoji: '✅',
      value: completions.length.toString(),
      label: t('stats.total_completed'),
      sub: t('stats.routines_completed'),
      accentColor: STAT_COLORS.completed,
    },
    {
      emoji: '🍅',
      value: totalPomodoros.toString(),
      label: t('stats.total_pomodoros'),
      sub: t('stats.pomodoros_done'),
      accentColor: STAT_COLORS.pomodoro,
    },
    {
      emoji: '📅',
      value: weeklyCompletions.length.toString(),
      label: t('stats.weekly'),
      sub: t('stats.routines_completed'),
      accentColor: STAT_COLORS.weekly,
    },
    {
      emoji: '🔥',
      value: '0',
      label: t('stats.current_streak'),
      sub: t('stats.weeks'),
      accentColor: STAT_COLORS.streak,
    },
  ];

  const today = new Date();
  const chartData: WeekBarData[] = Array.from({length: 7}, (_, i) => {
    const date = new Date();
    date.setDate(today.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const dayCompletions = completions.filter(c => c.date?.startsWith(dateStr)).length;
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today && !isToday;
    return {
      label: t(`weekdays.${SHORT_WEEKDAY_KEYS[date.getDay()]}`).charAt(0).toUpperCase(),
      value: dayCompletions,
      isPast,
      isToday,
    };
  });

  const currentPeriod = today.toLocaleDateString(i18n.language, {month: 'short', year: 'numeric'});

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('stats.title')}</Text>

        {isLoading ? (
          <View style={styles.grid}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={styles.gridItem}>
                <SkeletonRow />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.grid}>
            {statCards.map((card, i) => (
              <View key={i} style={styles.gridItem}>
                <StatCard {...card} index={i} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('stats.monthly')}</Text>
          {isLoading ? (
            <SkeletonRow />
          ) : (
            <WeekBarChart data={chartData} title={t('stats.routines_completed')} period={currentPeriod} maxHeight={100} />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, typography}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: spacing.xxl},
    title: {fontSize: typography.title, fontWeight: typography.bold, color: colors.textPrimary, padding: spacing.lg},
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    gridItem: {width: '47%'},
    section: {paddingHorizontal: spacing.lg, marginTop: spacing.sm},
    sectionTitle: {fontSize: typography.xl, fontWeight: typography.bold, color: colors.textPrimary, marginBottom: spacing.md},
  });
