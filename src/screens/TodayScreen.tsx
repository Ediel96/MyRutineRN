// src/screens/TodayScreen.tsx
// Pantalla principal de hoy - equivalente a Views/Today/TodayView.swift

import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {usePomodoroStore} from '../stores/pomodoroStore';
import TodayEventRow from '../components/TodayEventRow';
import {ScreenContainer, GradientView} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {TabScreenProps} from '../navigation/types';

type Props = TabScreenProps<'Today'>;

export default function TodayScreen({}: Props) {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {loadData, getEventsToday, getTodayProgress} = useRoutinesStore();
  const pomodoroRunning = usePomodoroStore(s => s.running);

  useEffect(() => {
    loadData();
  }, []);

  const eventsToday = getEventsToday();
  const progress = getTodayProgress();
  const progressPercent = progress.total > 0 ? progress.completed / progress.total : 0;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t('today.greeting_morning') :
    hour < 18 ? t('today.greeting_afternoon') :
    t('today.greeting_evening');

  const today = new Date();
  const dateStr = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleVoiceCreator = () => {
    navigation.navigate('VoiceCreator');
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <GradientView style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>{dateStr}</Text>
          {progress.total > 0 && (
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {width: `${progressPercent * 100}%`}]} />
              </View>
              <Text style={styles.progressLabel}>
                {progress.completed === progress.total
                  ? t('today.day_complete')
                  : t('today.progress', {completed: progress.completed, total: progress.total})}
              </Text>
            </View>
          )}
        </GradientView>

        {eventsToday.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌙</Text>
            <Text style={styles.emptyTitle}>{t('today.free_day')}</Text>
            <Text style={styles.emptyMessage}>{t('today.free_day_message')}</Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {eventsToday.map(event => (
              <TodayEventRow key={event.id} event={event} />
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity onPress={handleVoiceCreator} activeOpacity={0.85} style={styles.fabWrapper}>
        <GradientView variant="ai" style={styles.fab}>
          <Text style={styles.fabIcon}>🎤</Text>
        </GradientView>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography, shadows}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: 100},
    header: {
      margin: spacing.lg,
      borderRadius: radius.xxl,
      padding: spacing.xl,
      ...shadows.md,
    },
    greeting: {fontSize: typography.title, fontWeight: typography.bold, color: colors.white},
    date: {fontSize: typography.lg, color: colors.white, opacity: 0.85, marginTop: spacing.xs},
    progressRow: {marginTop: spacing.lg},
    progressBar: {height: 8, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden'},
    progressFill: {height: '100%', borderRadius: radius.full, backgroundColor: colors.white},
    progressLabel: {fontSize: typography.sm, color: colors.white, marginTop: spacing.sm, fontWeight: typography.medium},
    eventsList: {paddingVertical: spacing.sm},
    emptyState: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80},
    emptyIcon: {fontSize: 64, marginBottom: spacing.lg},
    emptyTitle: {fontSize: typography.xxl, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.sm},
    emptyMessage: {fontSize: typography.md, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xxl},
    fabWrapper: {position: 'absolute', bottom: 24, right: 24, ...shadows.lg, borderRadius: radius.full},
    fab: {width: 60, height: 60, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center'},
    fabIcon: {fontSize: 26},
  });
