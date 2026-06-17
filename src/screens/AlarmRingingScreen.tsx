import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  BackHandler,
  LayoutChangeEvent,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import HapticFeedback from 'react-native-haptic-feedback';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';
import {useRoutinesStore} from '../stores/routinesStore';
import {useAlarmStore} from '../stores/alarmStore';
import {AndroidAlarmModule} from '../native/AndroidAlarmModule';
import {IOSAlarmKitModule} from '../native/IOSAlarmKitModule';
import {EVENT_CATEGORY_CONFIG, EventCategory} from '../types/enums';

const THUMB_SIZE = 46;
const TRACK_PADDING = 6;
const SWIPE_THRESHOLD = 0.75;

const HAPTIC_OPTS = {enableVibrateFallback: true, ignoreAndroidSystemSettings: false};

const SNOOZE_ORDINALS = ['segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima'];

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmRinging'>;

export function AlarmRingingScreen({route, navigation}: Props) {
  const {alarmId, eventId} = route.params;

  const alarm = useAlarmStore(s => s.alarms.find(a => a.id === alarmId));
  const {events, calculateStreak, completeEventViaAlarm} = useRoutinesStore();
  const event = eventId ? events.find(e => e.id === eventId) : undefined;
  const streak = eventId ? calculateStreak(eventId) : 0;

  const categoryConfig = event
    ? EVENT_CATEGORY_CONFIG[event.categoryRaw as EventCategory]
    : null;

  const [now, setNow] = useState(new Date());
  const [snoozeCount, setSnoozeCount] = useState(0);

  const thumbX = useSharedValue(0);
  const maxTravelSV = useSharedValue(0);

  // Block Android hardware back — user must use one of the three actions
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // Update clock every 30 s
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Clear FLAG_KEEP_SCREEN_ON when screen unmounts
  useEffect(() => {
    return () => {
      if (Platform.OS === 'android') {
        AndroidAlarmModule.clearAlarmWindowFlags().catch(() => {});
      }
    };
  }, []);

  const stopPlayback = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        await AndroidAlarmModule.stopPlayback(alarmId);
      }
    } catch {}
  }, [alarmId]);

  const handleComplete = useCallback(async () => {
    HapticFeedback.trigger('notificationSuccess', HAPTIC_OPTS);
    if (eventId) {
      completeEventViaAlarm(eventId);
    }
    await stopPlayback();
    navigation.reset({index: 0, routes: [{name: 'Main'}]});
  }, [eventId, completeEventViaAlarm, stopPlayback, navigation]);

  const handleSnooze = useCallback(async () => {
    HapticFeedback.trigger('impactLight', HAPTIC_OPTS);
    const next = snoozeCount + 1;
    setSnoozeCount(next);
    try {
      if (Platform.OS === 'android') {
        await AndroidAlarmModule.snoozeAlarm(alarmId, 5);
      } else {
        await IOSAlarmKitModule.snoozeAlarm(alarmId, 5);
      }
    } catch {}
    navigation.goBack();
  }, [alarmId, snoozeCount, navigation]);

  const handleSkip = useCallback(() => {
    Alert.alert(
      'No se realizó',
      '¿Confirmas que no realizarás esta rutina hoy?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            HapticFeedback.trigger('notificationWarning', HAPTIC_OPTS);
            await stopPlayback();
            navigation.reset({index: 0, routes: [{name: 'Main'}]});
          },
        },
      ],
    );
  }, [stopPlayback, navigation]);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    maxTravelSV.value = Math.max(0, w - THUMB_SIZE - TRACK_PADDING * 2);
  };

  const panGesture = Gesture.Pan()
    .minDistance(1)
    .onStart(() => {
      runOnJS(HapticFeedback.trigger)('impactLight', HAPTIC_OPTS);
    })
    .onUpdate(e => {
      thumbX.value = Math.max(0, Math.min(maxTravelSV.value, e.translationX));
    })
    .onEnd(() => {
      const progress = maxTravelSV.value > 0 ? thumbX.value / maxTravelSV.value : 0;
      if (progress >= SWIPE_THRESHOLD) {
        thumbX.value = withTiming(maxTravelSV.value, {duration: 120}, () => {
          runOnJS(handleComplete)();
        });
      } else {
        thumbX.value = withSpring(0, {damping: 20, stiffness: 300});
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{translateX: thumbX.value}],
  }));

  const trackTextStyle = useAnimatedStyle(() => ({
    opacity: maxTravelSV.value > 0 ? 1 - thumbX.value / maxTravelSV.value : 1,
  }));

  const timeStr = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const title = event?.title ?? alarm?.label ?? 'Alarma';
  const emoji = categoryConfig?.emoji ?? '⏰';

  const snoozeCounterText =
    snoozeCount > 0
      ? `${SNOOZE_ORDINALS[snoozeCount - 1] ?? `${snoozeCount + 1}ª`} vez que pospones`
      : null;

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#1A1729', '#0D0D0D']}
        style={StyleSheet.absoluteFill}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
      />
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <SafeAreaView style={s.safe}>
        {/* ── Top: hora / título / emoji / racha ── */}
        <View style={s.topSection}>
          <Text style={s.clock}>{timeStr}</Text>
          <Text style={s.eventTitle}>{title}</Text>
          <Text style={s.emoji}>{emoji}</Text>

          {streak > 0 && (
            <View style={s.streakPill}>
              <Text style={s.streakText}>
                🔥 Racha de {streak} {streak === 1 ? 'día' : 'días'}
              </Text>
            </View>
          )}
        </View>

        <View style={s.spacer} />

        {/* ── Controles inferiores ── */}
        <View style={s.controls}>
          {/* Swipe track */}
          <GestureDetector gesture={panGesture}>
            <View style={s.track} onLayout={onTrackLayout}>
              <Animated.View style={[s.trackLabelWrap, trackTextStyle]}>
                <Text style={s.trackLabel}>Desliza para realizar</Text>
              </Animated.View>

              <Animated.View style={[s.thumb, thumbStyle]}>
                <Text style={s.thumbIcon}>✓</Text>
              </Animated.View>
            </View>
          </GestureDetector>

          {/* Botones secundarios */}
          <View style={s.secondaryRow}>
            <TouchableOpacity
              style={s.snoozeBtn}
              onPress={handleSnooze}
              accessibilityRole="button"
              accessibilityLabel="Recordar en 5 minutos">
              <Text style={s.snoozeBtnText}>5 min más</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.skipBtn}
              onPress={handleSkip}
              accessibilityRole="button"
              accessibilityLabel="No se realizó hoy">
              <Text style={s.skipBtnText}>No hoy</Text>
            </TouchableOpacity>
          </View>

          {snoozeCounterText ? (
            <Text style={s.snoozeCounter}>{snoozeCounterText}</Text>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // ── Top section ──
  topSection: {
    alignItems: 'center',
    paddingTop: 32,
  },
  clock: {
    fontSize: 44,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  eventTitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 6,
    textAlign: 'center',
  },
  emoji: {
    fontSize: 64,
    marginTop: 28,
    textAlign: 'center',
  },
  streakPill: {
    marginTop: 16,
    backgroundColor: 'rgba(251,146,60,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.35)',
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FB923C',
  },

  spacer: {flex: 1},

  // ── Controls ──
  controls: {
    paddingBottom: 16,
    gap: 14,
  },

  // Swipe track
  track: {
    height: 58,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: TRACK_PADDING,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackLabelWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.3,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#4ADE80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbIcon: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 26,
  },

  // Secondary row
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  snoozeBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(251,146,60,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251,146,60,0.40)',
  },
  snoozeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FB923C',
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Snooze counter
  snoozeCounter: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.30)',
    textAlign: 'center',
    marginTop: -4,
  },
});
