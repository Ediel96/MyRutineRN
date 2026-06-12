// src/screens/PomodoroScreen.tsx
import React, {useEffect} from 'react';
import {View, Text, StyleSheet, SafeAreaView, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {usePomodoroStore, formatTime} from '../stores/pomodoroStore';
import {useRoutinesStore} from '../stores/routinesStore';
import {colors, spacing, borderRadius, shadows} from '../theme/AppTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {PomodoroPhase, POMODORO_PHASE_CONFIG} from '../types/enums';

type Props = RootStackScreenProps<'Pomodoro'>;

export default function PomodoroScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const {t} = useTranslation();
  const {getEventById, getSubtaskById} = useRoutinesStore();
  const {phase, secondsRemaining, pomodorosCompleted, running, start, pause, resume, stop, skipPhase} = usePomodoroStore();

  const event = getEventById(route.params.eventId);
  const subtask = route.params.subtaskId ? getSubtaskById(route.params.subtaskId) : null;

  useEffect(() => {
    if (event) {
      start(event.title, subtask?.title, subtask?.id);
    }
    return () => { stop(); };
  }, []);

  const phaseConfig = POMODORO_PHASE_CONFIG[phase];
  const progress = phaseConfig.durationMinutes > 0 ? secondsRemaining / (phaseConfig.durationMinutes * 60) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{phaseConfig.emoji}</Text>
        <Text style={styles.phaseName}>{phaseConfig.displayName}</Text>
        <Text style={styles.timer}>{formatTime(secondsRemaining)}</Text>
        <View style={styles.progressRing}>
          <View style={[styles.progressFill, {height: `${progress * 100}%`}]} />
        </View>
        <View style={styles.stats}>
          <Text style={styles.statsText}>🍅 {pomodorosCompleted}</Text>
          {event && <Text style={styles.eventTitle}>{event.title}</Text>}
          {subtask && <Text style={styles.subtaskTitle}>→ {subtask.title}</Text>}
        </View>
      </View>
      <View style={styles.controls}>
        {!running ? (
          <TouchableOpacity style={styles.controlButton} onPress={phase === PomodoroPhase.stopped ? () => start(event?.title || '', subtask?.title, subtask?.id) : resume}>
            <Text style={styles.controlButtonText}>{phase === PomodoroPhase.stopped ? t('pomodoro.start') : t('pomodoro.resume')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.controlButton} onPress={pause}>
            <Text style={styles.controlButtonText}>{t('pomodoro.pause')}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.secondaryControls}>
          <TouchableOpacity style={styles.secondaryButton} onPress={skipPhase}><Text>⏭ Skip</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => { stop(); navigation.goBack(); }}><Text>⏹ Stop</Text></TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  content: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emoji: {fontSize: 80},
  phaseName: {fontSize: 24, fontWeight: 'bold', color: colors.textPrimaryLight, marginTop: spacing.lg},
  timer: {fontSize: 72, fontWeight: 'bold', color: colors.textPrimaryLight, marginTop: spacing.md, fontVariant: ['tabular-nums']},
  progressRing: {width: 200, height: 8, backgroundColor: colors.gray200, borderRadius: 4, marginTop: spacing.xl, overflow: 'hidden'},
  progressFill: {height: '100%', backgroundColor: colors.primary},
  stats: {marginTop: spacing.xl, alignItems: 'center'},
  statsText: {fontSize: 20},
  eventTitle: {fontSize: 16, color: colors.gray600, marginTop: spacing.sm},
  subtaskTitle: {fontSize: 14, color: colors.gray500, marginTop: spacing.xs},
  controls: {padding: spacing.xl},
  controlButton: {backgroundColor: colors.primary, padding: spacing.lg, borderRadius: borderRadius.full, alignItems: 'center', ...shadows.md},
  controlButtonText: {color: colors.white, fontSize: 18, fontWeight: 'bold'},
  secondaryControls: {flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.lg},
  secondaryButton: {padding: spacing.md, backgroundColor: colors.gray100, borderRadius: borderRadius.md},
});