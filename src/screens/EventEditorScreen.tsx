// src/screens/EventEditorScreen.tsx
import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform} from 'react-native';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {ScreenContainer, Card, TextField, Button} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {EventCategory, WeekDay} from '../types/enums';
import {EVENT_CATEGORY_CONFIG} from '../types/enums';

type Props = RootStackScreenProps<'EventEditor'>;

function parseTimeToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date;
}

function formatDateToTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export default function EventEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {addEvent, updateEvent, getEventById} = useRoutinesStore();
  const existingEvent = route.params?.eventId ? getEventById(route.params.eventId) : null;

  const [title, setTitle] = useState(existingEvent?.title || '');
  const [description, setDescription] = useState(existingEvent?.routineDescription || '');
  const [purpose, setPurpose] = useState(existingEvent?.purpose || '');
  const [objectives, setObjectives] = useState(existingEvent?.objectives || '');
  const [days, setDays] = useState<WeekDay[]>(existingEvent?.dayRaw ? [existingEvent.dayRaw as WeekDay] : [WeekDay.monday]);
  const [startTime, setStartTime] = useState(existingEvent?.startTime || '09:00');
  const [endTime, setEndTime] = useState(existingEvent?.endTime || '10:00');
  const [category, setCategory] = useState<EventCategory>((existingEvent?.categoryRaw as EventCategory) || EventCategory.work);
  const [alarmEnabled, setAlarmEnabled] = useState(existingEvent?.alarmEnabled || false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const toggleDay = (d: WeekDay) => {
    setDays(prev => {
      if (prev.includes(d)) {
        if (prev.length === 1) return prev;
        return prev.filter(x => x !== d);
      }
      return [...prev, d];
    });
  };

  const onStartTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setStartTime(formatDateToTime(selected));
  };

  const onEndTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setEndTime(formatDateToTime(selected));
  };

  const handleSave = () => {
    const baseData = {
      title, routineDescription: description, purpose, objectives,
      startTime, endTime, categoryRaw: category,
      notes: '', alarmEnabled, alarmTime: '08:50', alarmDaysRaw: '2,3,4,5,6',
      notifyMinutesBefore: 0, googleSynced: false,
    };
    if (existingEvent) {
      updateEvent(existingEvent.id, {...baseData, dayRaw: days[0]});
      days.slice(1).forEach(d => addEvent({...baseData, dayRaw: d}));
    } else {
      days.forEach(d => addEvent({...baseData, dayRaw: d}));
    }
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.field}>
          <TextField label={t('routine.title')} value={title} onChangeText={setTitle} placeholder="Routine name" />
        </Card>
        <Card style={styles.field}>
          <TextField label={t('routine.description')} value={description} onChangeText={setDescription} placeholder="Description" multiline style={styles.multiline} />
        </Card>
        <Card style={styles.field}>
          <TextField label={t('routine.purpose')} value={purpose} onChangeText={setPurpose} placeholder="Why is this important?" />
        </Card>
        <Card style={styles.field}>
          <TextField label={t('routine.objectives')} value={objectives} onChangeText={setObjectives} placeholder="What do you want to achieve?" />
        </Card>
        <Card style={styles.field}>
          <Text style={styles.label}>{t('routine.day')}</Text>
          <View style={styles.chipGroup}>
            {Object.values(WeekDay).map(d => (
              <TouchableOpacity key={d} style={[styles.chip, days.includes(d) && styles.chipActive]} onPress={() => toggleDay(d)}>
                <Text style={[styles.chipText, days.includes(d) && styles.chipTextActive]}>{d.slice(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
        <Card style={styles.field}>
          <Text style={styles.label}>{t('routine.start_time')} / {t('routine.end_time')}</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity style={[styles.timeButton, styles.timeInput]} onPress={() => setShowStartPicker(true)}>
              <Text style={styles.timeButtonText}>{startTime}</Text>
            </TouchableOpacity>
            <Text style={styles.timeSeparator}>-</Text>
            <TouchableOpacity style={[styles.timeButton, styles.timeInput]} onPress={() => setShowEndPicker(true)}>
              <Text style={styles.timeButtonText}>{endTime}</Text>
            </TouchableOpacity>
          </View>
          {showStartPicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={parseTimeToDate(startTime)}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant={theme.isDark ? 'dark' : 'light'}
                onChange={onStartTimeChange}
              />
              {Platform.OS === 'ios' && (
                <Button title={t('common.done')} variant="secondary" onPress={() => setShowStartPicker(false)} />
              )}
            </View>
          )}
          {showEndPicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={parseTimeToDate(endTime)}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant={theme.isDark ? 'dark' : 'light'}
                onChange={onEndTimeChange}
              />
              {Platform.OS === 'ios' && (
                <Button title={t('common.done')} variant="secondary" onPress={() => setShowEndPicker(false)} />
              )}
            </View>
          )}
        </Card>
        <Card style={styles.field}>
          <Text style={styles.label}>{t('routine.category')}</Text>
          <View style={styles.chipGroup}>
            {Object.values(EventCategory).map(c => {
              const config = EVENT_CATEGORY_CONFIG[c];
              const active = category === c;
              return (
                <TouchableOpacity key={c} style={[styles.chip, active && {backgroundColor: config?.color, borderColor: config?.color}]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{config?.emoji} {config?.displayName}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>
        <Card style={styles.field}>
          <View style={styles.toggleRow}>
            <Text style={styles.label}>{t('routine.alarm')}</Text>
            <Switch
              value={alarmEnabled}
              onValueChange={setAlarmEnabled}
              trackColor={{false: theme.colors.border, true: theme.colors.primary}}
              thumbColor={theme.colors.white}
            />
          </View>
        </Card>
      </ScrollView>
      <View style={styles.footer}>
        <Button title={t('common.cancel')} variant="secondary" onPress={() => navigation.goBack()} style={styles.footerButton} />
        <Button title={t('common.save')} variant="primary" onPress={handleSave} style={styles.footerButton} />
      </View>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md},
    field: {marginBottom: spacing.md},
    label: {fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, marginBottom: spacing.sm},
    multiline: {minHeight: 80, textAlignVertical: 'top'},
    chipGroup: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    chip: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border},
    chipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
    chipText: {fontSize: typography.xs + 1, color: colors.textPrimary},
    chipTextActive: {color: colors.white, fontWeight: typography.semibold},
    timeRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    timeInput: {flex: 1},
    timeButton: {paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.primary, alignItems: 'center'},
    timeButtonText: {fontSize: typography.md, color: colors.primary, fontWeight: typography.bold},
    timeSeparator: {color: colors.textSecondary, fontSize: typography.lg},
    pickerContainer: {marginTop: spacing.sm, alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm},
    toggleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    footer: {flexDirection: 'row', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border},
    footerButton: {flex: 1},
  });
