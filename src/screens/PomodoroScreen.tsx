// src/screens/PomodoroScreen.tsx
import React, {useEffect} from 'react';
import {View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import HapticFeedback from 'react-native-haptic-feedback';
import Animated, {useSharedValue, useAnimatedStyle, withSpring} from 'react-native-reanimated';
import {usePomodoroStore, formatTime} from '../stores/pomodoroStore';
import {useRoutinesStore} from '../stores/routinesStore';
import {GradientView} from '../components/ui';
import {ProgressRing, EventContextCard, TomatoCounter} from '../components/pomodoro';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {PomodoroPhase, POMODORO_PHASE_CONFIG, EventCategory, EVENT_CATEGORY_CONFIG} from '../types/enums';

type Props = RootStackScreenProps<'Pomodoro'>;

const PHASE_GRADIENT: Record<PomodoroPhase, 'primary' | 'ai' | 'warm'> = {
  [PomodoroPhase.work]: 'primary',
  [PomodoroPhase.shortBreak]: 'ai',
  [PomodoroPhase.longBreak]: 'warm',
  [PomodoroPhase.stopped]: 'primary',
};

const HAPTIC_OPTIONS = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

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
  const trackColor = onWarm ? 'rgba(75,46,131,0.18)' : 'rgba(255,255,255,0.25)';
  const buttonTextColor = onWarm ? theme.colors.white : theme.colors.textAccent;

  const PHASE_LABELS: Record<PomodoroPhase, string> = {
    [PomodoroPhase.work]: t('pomodoro.work'),
    [PomodoroPhase.shortBreak]: t('pomodoro.short_break'),
    [PomodoroPhase.longBreak]: t('pomodoro.long_break'),
    [PomodoroPhase.stopped]: t('pomodoro.title'),
  };
  const phaseLabel = PHASE_LABELS[phase];
  const categoryEmoji = event ? EVENT_CATEGORY_CONFIG[event.categoryRaw as EventCategory]?.emoji : undefined;

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
    <GradientView variant={PHASE_GRADIENT[phase]} style={styles.flex}>
      <StatusBar translucent backgroundColor="transparent" barStyle={onWarm ? 'dark-content' : 'light-content'} />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            accessibilityLabel={t('common.back')}
            accessibilityRole="button">
            <Text style={[styles.backIcon, {color: textColor}]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: textColor}]}>{t('pomodoro.title')}</Text>
          <View style={[styles.phasePill, {backgroundColor: `${textColor}1A`}]}>
            <Text style={[styles.phasePillText, {color: textColor}]}>{phaseConfig.emoji} {phaseLabel}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <ProgressRing
            progress={progress}
            emoji={phaseConfig.emoji}
            timeLabel={formatTime(secondsRemaining)}
            color={textColor}
            trackColor={trackColor}
          />

          <EventContextCard
            phaseLabel={phaseLabel}
            eventTitle={event?.title}
            categoryEmoji={categoryEmoji}
            subtaskTitle={subtask?.title}
            textColor={textColor}
          />

          <TomatoCounter completed={pomodorosCompleted} color={textColor} />
        </View>

        <View style={styles.controls}>
          <Animated.View style={buttonAnim}>
            <TouchableOpacity
              style={[styles.mainButton, {backgroundColor: textColor}]}
              onPressIn={() => { scale.value = withSpring(0.96); }}
              onPressOut={() => { scale.value = withSpring(1); }}
              onPress={handleMainPress}
              accessibilityLabel={mainLabel}
              accessibilityRole="button">
              <Text style={[styles.mainButtonText, {color: buttonTextColor}]}>{mainLabel}</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, {borderColor: `${textColor}40`}]}
              onPress={handleSkip}
              accessibilityLabel={t('pomodoro.skip')}
              accessibilityRole="button">
              <Text style={[styles.secondaryButtonText, {color: textColor}]}>⏭ {t('pomodoro.skip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.stopButton]}
              onPress={handleStop}
              accessibilityLabel={t('pomodoro.stop')}
              accessibilityRole="button">
              <Text style={[styles.secondaryButtonText, {color: textColor}]}>⏹ {t('pomodoro.stop')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </GradientView>
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
