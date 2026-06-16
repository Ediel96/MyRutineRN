// src/screens/PomodoroScreen.tsx
import React, {useEffect} from 'react';
import {View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import HapticFeedback from 'react-native-haptic-feedback';
import Animated, {useSharedValue, useAnimatedStyle, withSpring} from 'react-native-reanimated';
import {usePomodoroStore, formatTime} from '../stores/pomodoroStore';
import {useRoutinesStore} from '../stores/routinesStore';
import {ProgressRing, EventContextCard, TomatoCounter} from '../components/pomodoro';
import {useTheme, AppTheme} from '../theme/useTheme';
import {usePomodoroColors} from '../theme/usePomodoroColors';
import type {RootStackScreenProps} from '../navigation/types';
import {PomodoroPhase, POMODORO_PHASE_CONFIG, EventCategory, EVENT_CATEGORY_CONFIG} from '../types/enums';

type Props = RootStackScreenProps<'Pomodoro'>;

const HAPTIC_OPTIONS = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

export default function PomodoroScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {getEventById, getSubtaskById} = useRoutinesStore();
  const {phase, secondsRemaining, pomodorosCompleted, running, start, pause, resume, stop, skipPhase} = usePomodoroStore();
  const colors = usePomodoroColors(phase);

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
  const categoryEmoji = event ? EVENT_CATEGORY_CONFIG[event.categoryRaw as EventCategory]?.emoji : undefined;

  const PHASE_LABELS: Record<PomodoroPhase, string> = {
    [PomodoroPhase.work]: t('pomodoro.work'),
    [PomodoroPhase.shortBreak]: t('pomodoro.short_break'),
    [PomodoroPhase.longBreak]: t('pomodoro.long_break'),
    [PomodoroPhase.stopped]: t('pomodoro.title'),
  };
  const phaseLabel = PHASE_LABELS[phase];

  const scale = useSharedValue(1);
  const buttonAnim = useAnimatedStyle(() => ({transform: [{scale: scale.value}]}));

  const handleBack = () => {
    stop();
    navigation.goBack();
  };

  const handleMainPress = () => {
    HapticFeedback.trigger('impactMedium', HAPTIC_OPTIONS);
    if (!running) {
      if (phase === PomodoroPhase.stopped) {
        start(event?.title || '', subtask?.title, subtask?.id);
      } else {
        resume();
      }
    } else {
      pause();
    }
  };

  const handleSkip = () => {
    HapticFeedback.trigger('impactLight', HAPTIC_OPTIONS);
    skipPhase();
  };

  const handleStop = () => {
    HapticFeedback.trigger('notificationWarning', HAPTIC_OPTIONS);
    stop();
    navigation.goBack();
  };

  const mainLabel = !running
    ? (phase === PomodoroPhase.stopped ? t('pomodoro.start') : t('pomodoro.resume'))
    : t('pomodoro.pause');

  return (
    <View style={[styles.flex, {backgroundColor: colors.background}]}>
      <StatusBar
        translucent
        backgroundColor={colors.background}
        barStyle={colors.textPrimary === '#FFFFFF' ? 'light-content' : 'dark-content'}
      />
      <SafeAreaView style={[styles.flex, {backgroundColor: colors.background}]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            accessibilityLabel={t('common.back')}
            accessibilityRole="button">
            <Text style={[styles.backIcon, {color: colors.textPrimary}]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.accent}]}>{ t('pomodoro.title')}</Text>
          <View style={[styles.phasePill, {backgroundColor: colors.accentMuted}]}>
            <Text style={[styles.phasePillText, {color: colors.accent}]}>{phaseConfig.emoji} {phaseLabel}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <ProgressRing
            progress={progress}
            emoji={phaseConfig.emoji}
            timeLabel={formatTime(secondsRemaining)}
            color={colors.accent}
            trackColor={colors.ringTrack}
          />

          <EventContextCard
            phaseLabel={phaseLabel}
            eventTitle={event?.title}
            categoryEmoji={categoryEmoji}
            subtaskTitle={subtask?.title}
            textColor={colors.textPrimary}
            bgColor={colors.backgroundCard}
            borderColor={colors.cardBorder}
            accentColor={colors.accent}
          />

          <TomatoCounter completed={pomodorosCompleted} color={colors.accent} />
        </View>

        <View style={styles.controls}>
          <Animated.View style={buttonAnim}>
            <TouchableOpacity
              style={[styles.mainButton, {backgroundColor: colors.buttonBg}]}
              onPressIn={() => { scale.value = withSpring(0.96); }}
              onPressOut={() => { scale.value = withSpring(1); }}
              onPress={handleMainPress}
              accessibilityLabel={mainLabel}
              accessibilityRole="button">
              <Text style={[styles.mainButtonText, {color: colors.buttonText}]}>{mainLabel}</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, {borderColor: `${colors.accent}40`}]}
              onPress={handleSkip}
              accessibilityLabel={t('pomodoro.skip')}
              accessibilityRole="button">
              <Text style={[styles.secondaryButtonText, {color: colors.textPrimary}]}>⏭ {t('pomodoro.skip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.stopButton]}
              onPress={handleStop}
              accessibilityLabel={t('pomodoro.stop')}
              accessibilityRole="button">
              <Text style={[styles.secondaryButtonText, {color: colors.textPrimary}]}>⏹ {t('pomodoro.stop')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = ({spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    flex: {flex: 1},
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    backIcon: {fontSize: 24, fontWeight: typography.bold},
    headerTitle: {fontSize: typography.lg, fontWeight: typography.bold},
    phasePill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    phasePillText: {fontSize: typography.sm, fontWeight: typography.semibold},
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.xl,
    },
    controls: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    mainButton: {
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    mainButtonText: {fontSize: typography.lg, fontWeight: typography.bold},
    secondaryRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stopButton: {
      backgroundColor: 'rgba(255,90,90,0.18)',
      borderColor: 'rgba(255,90,90,0.45)',
    },
    secondaryButtonText: {fontSize: typography.md, fontWeight: typography.semibold},
  });
