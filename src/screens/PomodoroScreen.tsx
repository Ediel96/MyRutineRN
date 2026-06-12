// src/screens/PomodoroScreen.tsx
import React, {useEffect} from 'react';
import {View, Text, StyleSheet, SafeAreaView, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {usePomodoroStore, formatTime} from '../stores/pomodoroStore';
import {useRoutinesStore} from '../stores/routinesStore';
import {GradientView} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {PomodoroPhase, POMODORO_PHASE_CONFIG} from '../types/enums';

type Props = RootStackScreenProps<'Pomodoro'>;

const PHASE_GRADIENT: Record<PomodoroPhase, 'primary' | 'ai' | 'warm'> = {
  [PomodoroPhase.work]: 'primary',
  [PomodoroPhase.shortBreak]: 'ai',
  [PomodoroPhase.longBreak]: 'warm',
  [PomodoroPhase.stopped]: 'primary',
};

export default function PomodoroScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
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
  const onWarm = PHASE_GRADIENT[phase] === 'warm';
  const textColor = onWarm ? theme.colors.textAccent : theme.colors.white;

  return (
    <GradientView variant={PHASE_GRADIENT[phase]} style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <Text style={styles.emoji}>{phaseConfig.emoji}</Text>
          <Text style={[styles.phaseName, {color: textColor}]}>{phaseConfig.displayName}</Text>
          <Text style={[styles.timer, {color: textColor}]}>{formatTime(secondsRemaining)}</Text>
          <View style={[styles.progressBar, {backgroundColor: onWarm ? 'rgba(75,46,131,0.18)' : 'rgba(255,255,255,0.25)'}]}>
            <View style={[styles.progressFill, {width: `${progress * 100}%`, backgroundColor: textColor}]} />
          </View>
          <View style={styles.stats}>
            <Text style={[styles.statsText, {color: textColor}]}>🍅 {pomodorosCompleted}</Text>
            {event && <Text style={[styles.eventTitle, {color: textColor}]}>{event.title}</Text>}
            {subtask && <Text style={[styles.subtaskTitle, {color: textColor}]}>→ {subtask.title}</Text>}
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
            <TouchableOpacity style={[styles.secondaryButton, {borderColor: textColor}]} onPress={skipPhase}><Text style={[styles.secondaryButtonText, {color: textColor}]}>⏭ Skip</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryButton, {borderColor: textColor}]} onPress={() => { stop(); navigation.goBack(); }}><Text style={[styles.secondaryButtonText, {color: textColor}]}>⏹ Stop</Text></TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </GradientView>
  );
}

const createStyles = ({colors, spacing, radius, typography, shadows}: AppTheme) =>
  StyleSheet.create({
    flex: {flex: 1},
    content: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    emoji: {fontSize: 80},
    phaseName: {fontSize: typography.xxl, fontWeight: typography.bold, marginTop: spacing.lg, letterSpacing: 0.5},
    timer: {fontSize: 72, fontWeight: typography.bold, marginTop: spacing.md, fontVariant: ['tabular-nums']},
    progressBar: {width: 220, height: 8, borderRadius: radius.full, marginTop: spacing.xl, overflow: 'hidden'},
    progressFill: {height: '100%', borderRadius: radius.full},
    stats: {marginTop: spacing.xl, alignItems: 'center'},
    statsText: {fontSize: typography.xxl, fontWeight: typography.semibold},
    eventTitle: {fontSize: typography.lg, marginTop: spacing.sm, opacity: 0.9},
    subtaskTitle: {fontSize: typography.md, marginTop: spacing.xs, opacity: 0.8},
    controls: {padding: spacing.xl},
    controlButton: {backgroundColor: colors.white, paddingVertical: spacing.lg, borderRadius: radius.full, alignItems: 'center', ...shadows.lg},
    controlButtonText: {color: colors.primary, fontSize: typography.xl, fontWeight: typography.bold},
    secondaryControls: {flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.lg},
    secondaryButton: {paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.full, borderWidth: 1.5},
    secondaryButtonText: {fontWeight: typography.semibold},
  });
