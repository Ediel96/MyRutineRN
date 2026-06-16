import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme, AppTheme} from '../theme/useTheme';
import {useAlarmStore} from '../stores/alarmStore';
import {CustomSoundPicker} from '../components/alarm/CustomSoundPicker';
import type {AlarmSoundSource, AlarmRepeatDay} from '../types/alarm';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmEditor'>;

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const SNOOZE_OPTIONS = [5, 10, 15, 30] as const;

const DEFAULT_SOUND: AlarmSoundSource = {
  type: 'system',
  soundId: 'default',
  label: 'Sonido del sistema',
};

export function AlarmEditorScreen({route, navigation}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const {alarms, createAlarm, updateAlarm} = useAlarmStore();

  const editId = route.params?.alarmId;
  const existing = editId ? alarms.find(a => a.id === editId) : undefined;

  const [hour, setHour] = useState(existing?.hour ?? 7);
  const [minute, setMinute] = useState(existing?.minute ?? 0);
  const [label, setLabel] = useState(existing?.label ?? '');
  const [repeatDays, setRepeatDays] = useState<AlarmRepeatDay[]>(
    existing?.repeatDays ?? [],
  );
  const [sound, setSound] = useState<AlarmSoundSource>(
    existing?.sound ?? DEFAULT_SOUND,
  );
  const [volume, _setVolume] = useState(existing?.volume ?? 80);
  const [vibrate, setVibrate] = useState(existing?.vibrate ?? true);
  const [snoozeEnabled, setSnoozeEnabled] = useState(
    existing?.snoozeEnabled ?? true,
  );
  const [snoozeMinutes, setSnoozeMinutes] = useState<5 | 10 | 15 | 30>(
    existing?.snoozeMinutes ?? 5,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({title: editId ? 'Editar alarma' : 'Nueva alarma'});
  }, [editId, navigation]);

  const toggleDay = (day: AlarmRepeatDay) => {
    setRepeatDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    );
  };

  const handleSave = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      const payload = {
        hour,
        minute,
        label: label.trim() || 'Alarma',
        enabled: true,
        repeatDays,
        sound,
        volume,
        snoozeMinutes,
        snoozeEnabled,
        vibrate,
      };
      if (editId) {
        await updateAlarm(editId, payload);
      } else {
        await createAlarm(payload);
      }
      navigation.goBack();
    } catch (e) {
      console.warn('AlarmEditor save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const padNum = (n: number) => String(n).padStart(2, '0');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={styles.timeRow}>
          <TouchableOpacity
            onPress={() => setHour(h => (h + 1) % 24)}
            style={styles.timeBtn}
            accessibilityRole="button"
            accessibilityLabel="Incrementar hora">
            <Text style={styles.timeBtnText}>▲</Text>
          </TouchableOpacity>
          <Text style={styles.timeDisplay}>
            {padNum(hour)}:{padNum(minute)}
          </Text>
          <TouchableOpacity
            onPress={() => setMinute(m => (m + 1) % 60)}
            style={styles.timeBtn}
            accessibilityRole="button"
            accessibilityLabel="Incrementar minutos">
            <Text style={styles.timeBtnText}>▲</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Etiqueta</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Nombre de la alarma"
            placeholderTextColor={theme.colors.textTertiary}
            maxLength={40}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Repetir</Text>
          <View style={styles.daysRow}>
            {DAY_LABELS.map((d, i) => {
              const day = i as AlarmRepeatDay;
              const active = repeatDays.includes(day);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  onPress={() => toggleDay(day)}
                  accessibilityRole="button"
                  accessibilityLabel={`${DAY_NAMES[i]} ${active ? 'activado' : 'desactivado'}`}>
                  <Text
                    style={[styles.dayLabel, active && styles.dayLabelActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {Platform.OS === 'android' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Sonido personalizado</Text>
            <CustomSoundPicker current={sound} onChange={setSound} />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Vibrar</Text>
            <Switch
              value={vibrate}
              onValueChange={setVibrate}
              trackColor={{false: theme.colors.border, true: theme.colors.primary}}
              thumbColor={vibrate ? '#FFFFFF' : theme.colors.textTertiary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Posponer</Text>
            <Switch
              value={snoozeEnabled}
              onValueChange={setSnoozeEnabled}
              trackColor={{false: theme.colors.border, true: theme.colors.primary}}
              thumbColor={snoozeEnabled ? '#FFFFFF' : theme.colors.textTertiary}
            />
          </View>
          {snoozeEnabled && (
            <View style={styles.snoozeOptions}>
              {SNOOZE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.snoozeChip,
                    snoozeMinutes === opt && styles.snoozeChipActive,
                  ]}
                  onPress={() => setSnoozeMinutes(opt)}
                  accessibilityRole="button"
                  accessibilityLabel={`Posponer ${opt} minutos`}>
                  <Text
                    style={[
                      styles.snoozeChipText,
                      snoozeMinutes === opt && styles.snoozeChipTextActive,
                    ]}>
                    {opt} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Guardar alarma">
          <Text style={styles.saveBtnText}>
            {saving ? 'Guardando...' : 'Guardar alarma'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.xl,
      gap: theme.spacing.xl,
      paddingBottom: 48,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xxl,
      paddingVertical: theme.spacing.xl,
    },
    timeDisplay: {
      fontSize: 64,
      fontWeight: theme.typography.extrabold,
      color: theme.colors.textPrimary,
      letterSpacing: 4,
      minWidth: 180,
      textAlign: 'center',
    },
    timeBtn: {
      padding: theme.spacing.md,
    },
    timeBtnText: {
      fontSize: theme.typography.xxl,
      color: theme.colors.primary,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionLabel: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.semibold,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.md,
      color: theme.colors.textPrimary,
    },
    daysRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    dayChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dayChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    dayLabel: {
      fontSize: theme.typography.sm,
      fontWeight: theme.typography.semibold,
      color: theme.colors.textSecondary,
    },
    dayLabelActive: {
      color: '#FFFFFF',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    rowLabel: {
      fontSize: theme.typography.md,
      fontWeight: theme.typography.medium,
      color: theme.colors.textPrimary,
    },
    snoozeOptions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    snoozeChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    snoozeChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    snoozeChipText: {
      fontSize: theme.typography.sm,
      color: theme.colors.textSecondary,
    },
    snoozeChipTextActive: {
      color: '#FFFFFF',
      fontWeight: theme.typography.semibold,
    },
    saveBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.xl,
      paddingVertical: 18,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    saveBtnText: {
      fontSize: theme.typography.lg,
      fontWeight: theme.typography.bold,
      color: '#FFFFFF',
    },
  });
}
