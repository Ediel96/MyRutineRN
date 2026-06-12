// src/screens/EventEditorScreen.tsx
import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {ScreenContainer, Card, TextField, Button} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {EventCategory, WeekDay} from '../types/enums';
import {EVENT_CATEGORY_CONFIG} from '../types/enums';

type Props = RootStackScreenProps<'EventEditor'>;

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
              <TouchableOpacity key={d} style={[styles.chip, day === d && styles.chipActive]} onPress={() => setDay(d)}>
                <Text style={[styles.chipText, day === d && styles.chipTextActive]}>{d.slice(0, 3)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
        <Card style={styles.field}>
          <Text style={styles.label}>{t('routine.start_time')} / {t('routine.end_time')}</Text>
          <View style={styles.timeRow}>
            <TextField value={startTime} onChangeText={setStartTime} placeholder="09:00" containerStyle={styles.timeInput} />
            <Text style={styles.timeSeparator}>-</Text>
            <TextField value={endTime} onChangeText={setEndTime} placeholder="10:00" containerStyle={styles.timeInput} />
          </View>
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
    timeSeparator: {color: colors.textSecondary, fontSize: typography.lg},
    toggleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    footer: {flexDirection: 'row', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border},
    footerButton: {flex: 1},
  });
