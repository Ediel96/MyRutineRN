// src/screens/SubtaskEditorScreen.tsx
import React, {useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {ScreenContainer, Card, TextField, Button} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';

type Props = RootStackScreenProps<'SubtaskEditor'>;

export default function SubtaskEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
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
    <ScreenContainer>
      <View style={styles.content}>
        <Card style={styles.field}>
          <TextField label={t('subtask.title')} value={title} onChangeText={setTitle} placeholder="Subtask name" />
        </Card>
        <Card style={styles.field}>
          <TextField label={t('subtask.detail')} value={detail} onChangeText={setDetail} placeholder="Details (optional)" multiline style={styles.multiline} />
        </Card>
        <Card style={styles.field}>
          <TextField label={t('subtask.pomodoro_minutes')} value={pomodoroMinutes} onChangeText={setPomodoroMinutes} placeholder="25" keyboardType="number-pad" />
        </Card>
      </View>
      <View style={styles.footer}>
        <Button title={t('common.cancel')} variant="secondary" onPress={() => navigation.goBack()} style={styles.footerButton} />
        <Button title={t('common.save')} variant="primary" onPress={handleSave} style={styles.footerButton} />
      </View>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing}: AppTheme) =>
  StyleSheet.create({
    content: {flex: 1, padding: spacing.lg},
    field: {marginBottom: spacing.md},
    multiline: {minHeight: 80, textAlignVertical: 'top'},
    footer: {flexDirection: 'row', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border},
    footerButton: {flex: 1},
  });
