// src/screens/StatsScreen.tsx
import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {ScreenContainer, Card} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {TabScreenProps} from '../navigation/types';
import * as storage from '../services/storage';

type Props = TabScreenProps<'Stats'>;

export default function StatsScreen({}: Props) {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {loadData, events, completions} = useRoutinesStore();

  useEffect(() => { loadData(); }, []);

  const sessions = storage.getAllPomodoroSessions();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyCompletions = completions.filter(c => new Date(c.date) >= weekAgo);
  const totalPomodoros = sessions.length;

  const statCards = [
    {label: t('stats.total_completed'), value: completions.length.toString(), sub: t('stats.routines_completed'), emoji: '✅'},
    {label: t('stats.total_pomodoros'), value: totalPomodoros.toString(), sub: t('stats.pomodoros_done'), emoji: '🍅'},
    {label: t('stats.weekly'), value: weeklyCompletions.length.toString(), sub: t('stats.routines_completed'), emoji: '📅'},
    {label: t('stats.current_streak'), value: '0', sub: t('stats.weeks'), emoji: '🔥'},
  ];

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('stats.title')}</Text>
        <View style={styles.grid}>
          {statCards.map((card, i) => (
            <Card key={i} style={styles.card}>
              <Text style={styles.cardEmoji}>{card.emoji}</Text>
              <Text style={styles.cardValue}>{card.value}</Text>
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={styles.cardSub}>{card.sub}</Text>
            </Card>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('stats.monthly')}</Text>
          <Card style={styles.barChart}>
            {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
              <View key={i} style={styles.barContainer}>
                <View style={[styles.bar, {height: h}]} />
                <Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: spacing.xxl},
    title: {fontSize: typography.title, fontWeight: typography.bold, color: colors.textPrimary, padding: spacing.lg},
    grid: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md},
    card: {width: '46%', margin: '2%', alignItems: 'center'},
    cardEmoji: {fontSize: 32, marginBottom: spacing.sm},
    cardValue: {fontSize: typography.display, fontWeight: typography.bold, color: colors.textPrimary},
    cardLabel: {fontSize: typography.md, fontWeight: typography.semibold, color: colors.textPrimary, marginTop: spacing.xs},
    cardSub: {fontSize: typography.sm, color: colors.textSecondary},
    section: {padding: spacing.lg},
    sectionTitle: {fontSize: typography.xl, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.md},
    barChart: {flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 150},
    barContainer: {alignItems: 'center'},
    bar: {width: 24, backgroundColor: colors.primary, borderRadius: radius.sm},
    barLabel: {fontSize: typography.xs, color: colors.textSecondary, marginTop: spacing.xs},
  });
