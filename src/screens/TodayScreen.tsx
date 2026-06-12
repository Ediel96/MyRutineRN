// src/screens/TodayScreen.tsx
// Pantalla principal de hoy - equivalente a Views/Today/TodayView.swift

import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {usePomodoroStore} from '../stores/pomodoroStore';
import TodayEventRow from '../components/TodayEventRow';
import {colors, spacing, borderRadius, shadows} from '../theme/AppTheme';
import type {TabScreenProps} from '../navigation/types';

type Props = TabScreenProps<'Today'>;

export default function TodayScreen({}: Props) {
  const navigation = useNavigation();
  const {t} = useTranslation();
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>

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

      <TouchableOpacity style={styles.fab} onPress={handleVoiceCreator}>
        <Text style={styles.fabIcon}>🎤</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  scrollView: {flex: 1},
  scrollContent: {paddingBottom: 100},
  header: {padding: spacing.lg, paddingTop: spacing.xl},
  greeting: {fontSize: 28, fontWeight: 'bold', color: colors.textPrimaryLight},
  date: {fontSize: 16, color: colors.gray600, marginTop: spacing.xs},
  eventsList: {paddingVertical: spacing.sm},
  emptyState: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80},
  emptyIcon: {fontSize: 64, marginBottom: spacing.lg},
  emptyTitle: {fontSize: 20, fontWeight: '600', color: colors.textPrimaryLight, marginBottom: spacing.sm},
  emptyMessage: {fontSize: 14, color: colors.gray600, textAlign: 'center', paddingHorizontal: spacing.xxl},
  fab: {position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadows.lg},
  fabIcon: {fontSize: 24},
});