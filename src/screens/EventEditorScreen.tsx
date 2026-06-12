// src/screens/EventEditorScreen.tsx
import React, {useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {colors, spacing, borderRadius} from '../theme/AppTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {EventCategory, WeekDay} from '../types/enums';
import {EVENT_CATEGORY_CONFIG} from '../types/enums';

type Props = RootStackScreenProps<'EventEditor'>;

export default function EventEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const {t} = useTranslation();
  const {addEvent, updateEvent, getEventById} = useRoutinesStore();
  const existingEvent = route.params?.eventId ? getEventById(route.params.eventId) : null;

  const [title, setTitle] = useState(existingEvent?.title || '');
  const [description, setDescription] = useState(existingEvent?.routineDescription || '');
  const [purpose, setPurpose] = useState(existingEvent?.purpose || '');
  const [objectives, setObjectives] = useState(existingEvent?.objectives || '');
  const [day, setDay] = useState<WeekDay>((existingEvent?.dayRaw as WeekDay) || WeekDay.monday);
  const [startTime, setStartTime] = useState(existingEvent?.startTime || '09:00');
  const [endTime, setEndTime] = useState(existingEvent?.endTime || '10:00');
  const [category, setCategory] = useState<EventCategory>((existingEvent?.categoryRaw as EventCategory) || EventCategory.work);
  const [alarmEnabled, setAlarmEnabled] = useState(existingEvent?.alarmEnabled || false);

  const handleSave = () => {
    const eventData = {
      title, routineDescription: description, purpose, objectives,
      dayRaw: day, startTime, endTime, categoryRaw: category,
      notes: '', alarmEnabled, alarmTime: '08:50', alarmDaysRaw: '2,3,4,5,6',
      notifyMinutesBefore: 0, googleSynced: false,
    };
    if (existingEvent) {
      updateEvent(existingEvent.id, eventData);
    } else {
      addEvent(eventData);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.field}>
          <Text style={styles.label}>{t('routine.title')}</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Routine name" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('routine.description')}</Text>
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="Description" multiline />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('routine.purpose')}</Text>
          <TextInput style={styles.input} value={purpose} onChangeText={setPurpose} placeholder="Why is this important?" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('routine.objectives')}</Text>
          <TextInput style={styles.input} value={objectives} onChangeText={setObjectives} placeholder="What do you want to achieve?" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('routine.day')}</Text>
          <View style={styles.chipGroup}>
            {Object.values(WeekDay).map(d => (
              <TouchableOpacity key={d} style={[styles.chip, day === d && styles.chipActive]} onPress={() => setDay(d)}>
                <Text style={[styles.chipText, day === d && styles.chipTextActive]}>{d.slice(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('routine.start_time')} / {t('routine.end_time')}</Text>
          <View style={styles.timeRow}>
            <TextInput style={[styles.input, styles.timeInput]} value={startTime} onChangeText={setStartTime} placeholder="09:00" />
            <Text>-</Text>
            <TextInput style={[styles.input, styles.timeInput]} value={endTime} onChangeText={setEndTime} placeholder="10:00" />
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('routine.category')}</Text>
          <View style={styles.chipGroup}>
            {Object.values(EventCategory).map(c => {
              const config = EVENT_CATEGORY_CONFIG[c];
              return (
                <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive, {borderColor: config?.color}]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{config?.emoji} {config?.displayName}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.field}>
          <TouchableOpacity style={styles.toggleRow} onPress={() => setAlarmEnabled(!alarmEnabled)}>
            <Text style={styles.label}>{t('routine.alarm')}</Text>
            <View style={[styles.toggle, alarmEnabled && styles.toggleActive]}><View style={styles.toggleThumb} /></View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}><Text style={styles.saveText}>{t('common.save')}</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  scrollView: {flex: 1},
  field: {backgroundColor: colors.white, marginBottom: spacing.sm, padding: spacing.lg},
  label: {fontSize: 14, fontWeight: '600', color: colors.gray600, marginBottom: spacing.sm},
  input: {borderWidth: 1, borderColor: colors.gray300, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 16},
  chipGroup: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
  chip: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200},
  chipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipText: {fontSize: 12, color: colors.textPrimaryLight},
  chipTextActive: {color: colors.white},
  timeRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
  timeInput: {flex: 1},
  toggleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  toggle: {width: 50, height: 30, borderRadius: 15, backgroundColor: colors.gray300, justifyContent: 'center', paddingHorizontal: 2},
  toggleActive: {backgroundColor: colors.primary, alignItems: 'flex-end'},
  toggleThumb: {width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white},
  footer: {flexDirection: 'row', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray200},
  cancelButton: {flex: 1, padding: spacing.md, alignItems: 'center', backgroundColor: colors.gray100, borderRadius: borderRadius.md},
  cancelText: {color: colors.textPrimaryLight, fontWeight: '600'},
  saveButton: {flex: 1, padding: spacing.md, alignItems: 'center', backgroundColor: colors.primary, borderRadius: borderRadius.md},
  saveText: {color: colors.white, fontWeight: '600'},
});