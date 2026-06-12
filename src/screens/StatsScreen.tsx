// src/screens/StatsScreen.tsx
import React, {useEffect} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {colors, spacing, borderRadius, shadows} from '../theme/AppTheme';
import type {TabScreenProps} from '../navigation/types';
import * as storage from '../services/storage';

type Props = TabScreenProps<'Stats'>;

export default function StatsScreen({}: Props) {
  const {t} = useTranslation();
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>{t('stats.title')}</Text>
        <View style={styles.grid}>
          {statCards.map((card, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardEmoji}>{card.emoji}</Text>
              <Text style={styles.cardValue}>{card.value}</Text>
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={styles.cardSub}>{card.sub}</Text>
            </View>
          ))}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('stats.monthly')}</Text>
          <View style={styles.barChart}>
            {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
              <View key={i} style={styles.barContainer}>
                <View style={[styles.bar, {height: h}]} />
                <Text style={styles.barLabel}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  scrollView: {flex: 1},
  title: {fontSize: 24, fontWeight: 'bold', color: colors.textPrimaryLight, padding: spacing.lg},
  grid: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md},
  card: {width: '46%', backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, margin: '2%', alignItems: 'center', ...shadows.sm},
  cardEmoji: {fontSize: 32, marginBottom: spacing.sm},
  cardValue: {fontSize: 32, fontWeight: 'bold', color: colors.textPrimaryLight},
  cardLabel: {fontSize: 14, fontWeight: '600', color: colors.textPrimaryLight, marginTop: spacing.xs},
  cardSub: {fontSize: 12, color: colors.gray500},
  section: {padding: spacing.lg},
  sectionTitle: {fontSize: 18, fontWeight: '600', color: colors.textPrimaryLight, marginBottom: spacing.md},
  barChart: {flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 150, backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg},
  barContainer: {alignItems: 'center'},
  bar: {width: 24, backgroundColor: colors.primary, borderRadius: 4},
  barLabel: {fontSize: 10, color: colors.gray500, marginTop: spacing.xs},
});