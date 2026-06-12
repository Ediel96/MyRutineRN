// src/screens/SubtaskEditorScreen.tsx
import React, {useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {colors, spacing, borderRadius} from '../theme/AppTheme';
import type {RootStackScreenProps} from '../navigation/types';

type Props = RootStackScreenProps<'SubtaskEditor'>;

export default function SubtaskEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const {t} = useTranslation();
  const {addSubtask, updateSubtask, getSubtasksByEventId} = useRoutinesStore();
  const existingSubtask = route.params?.subtaskId ? getSubtasksByEventId(route.params.eventId).find(s => s.id === route.params.subtaskId) : null;

  const [title, setTitle] = useState(existingSubtask?.title || '');
  const [detail, setDetail] = useState(existingSubtask?.detail || '');
  const [pomodoroMinutes, setPomodoroMinutes] = useState(existingSubtask?.pomodoroMinutes?.toString() || '25');

  const handleSave = () => {
    const subtaskData = {
      title, detail, statusRaw: 'todo', pomodoroMinutes: parseInt(pomodoroMinutes) || null,
      order: 0, lastCompletedAt: null, archivedAt: null, totalCompletions: 0,
      totalPomodorosCompleted: 0, totalMinutesFocused: 0, progressNotes: '', eventId: route.params.eventId,
    };
    if (existingSubtask) {
      updateSubtask(existingSubtask.id, subtaskData);
    } else {
      addSubtask(subtaskData);
    }
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>{t('subtask.title')}</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Subtask name" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('subtask.detail')}</Text>
          <TextInput style={styles.input} value={detail} onChangeText={setDetail} placeholder="Details (optional)" multiline />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('subtask.pomodoro_minutes')}</Text>
          <TextInput style={styles.input} value={pomodoroMinutes} onChangeText={setPomodoroMinutes} placeholder="25" keyboardType="number-pad" />
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}><Text style={styles.cancelText}>{t('common.cancel')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}><Text style={styles.saveText}>{t('common.save')}</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  content: {flex: 1, padding: spacing.lg},
  field: {backgroundColor: colors.white, marginBottom: spacing.md, padding: spacing.lg, borderRadius: borderRadius.lg},
  label: {fontSize: 14, fontWeight: '600', color: colors.gray600, marginBottom: spacing.sm},
  input: {borderWidth: 1, borderColor: colors.gray300, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 16},
  footer: {flexDirection: 'row', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray200},
  cancelButton: {flex: 1, padding: spacing.md, alignItems: 'center', backgroundColor: colors.gray100, borderRadius: borderRadius.md},
  cancelText: {color: colors.textPrimaryLight, fontWeight: '600'},
  saveButton: {flex: 1, padding: spacing.md, alignItems: 'center', backgroundColor: colors.primary, borderRadius: borderRadius.md},
  saveText: {color: colors.white, fontWeight: '600'},
});