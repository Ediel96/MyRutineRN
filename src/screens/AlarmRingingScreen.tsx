import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {useTheme, AppTheme} from '../theme/useTheme';
import {useAlarmStore} from '../stores/alarmStore';
import {AndroidAlarmModule} from '../native/AndroidAlarmModule';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmRinging'>;

export function AlarmRingingScreen({route, navigation}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const {alarmId} = route.params;
  const alarm = useAlarmStore(s => s.alarms.find(a => a.id === alarmId));
  const [snoozed, setSnoozed] = useState(false);

  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.12, {duration: 700, easing: Easing.inOut(Easing.ease)}),
      -1,
      true,
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulse.value}],
  }));

  const handleStop = async () => {
    if (Platform.OS === 'android') {
      await AndroidAlarmModule.stopPlayback(alarmId);
    }
    navigation.goBack();
  };

  const handleSnooze = async () => {
    if (snoozed) {
      return;
    }
    const minutes = alarm?.snoozeMinutes ?? 5;
    if (Platform.OS === 'android') {
      await AndroidAlarmModule.snoozeAlarm(alarmId, minutes);
    }
    setSnoozed(true);
    navigation.goBack();
  };

  const label = alarm?.label ?? 'Alarma';
  const snoozeLabel = alarm?.snoozeEnabled
    ? `Posponer ${alarm.snoozeMinutes} min`
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        <Animated.View style={[styles.iconWrap, pulseStyle]}>
          <Text style={styles.bell}>⏰</Text>
        </Animated.View>

        <Text style={styles.labelText}>{label}</Text>
        <Text style={styles.timeText}>
          {alarm
            ? `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}`
            : '--:--'}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={handleStop}
            accessibilityRole="button"
            accessibilityLabel="Detener alarma">
            <Text style={styles.stopText}>Detener</Text>
          </TouchableOpacity>

          {snoozeLabel && !snoozed && (
            <TouchableOpacity
              style={styles.snoozeBtn}
              onPress={handleSnooze}
              accessibilityRole="button"
              accessibilityLabel={snoozeLabel}>
              <Text style={styles.snoozeText}>{snoozeLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#000000',
    },
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
      paddingHorizontal: theme.spacing.xl,
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    bell: {
      fontSize: 96,
    },
    labelText: {
      fontSize: theme.typography.xxl,
      fontWeight: theme.typography.bold,
      color: '#FFFFFF',
      textAlign: 'center',
    },
    timeText: {
      fontSize: 64,
      fontWeight: theme.typography.extrabold,
      color: '#FFFFFF',
      letterSpacing: 4,
    },
    actions: {
      width: '100%',
      gap: theme.spacing.md,
      marginTop: theme.spacing.xl,
    },
    stopBtn: {
      backgroundColor: '#FF4D1A',
      borderRadius: theme.radius.xl,
      paddingVertical: 18,
      alignItems: 'center',
    },
    stopText: {
      fontSize: theme.typography.lg,
      fontWeight: theme.typography.bold,
      color: '#FFFFFF',
    },
    snoozeBtn: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: theme.radius.xl,
      paddingVertical: 18,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    snoozeText: {
      fontSize: theme.typography.lg,
      fontWeight: theme.typography.semibold,
      color: '#FFFFFF',
    },
  });
}
