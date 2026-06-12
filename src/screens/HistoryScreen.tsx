// src/screens/HistoryScreen.tsx
import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore, getArchivedSubtasks} from '../stores/routinesStore';
import {colors, spacing, borderRadius} from '../theme/AppTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {TaskStatus} from '../types/enums';
import {TASK_STATUS_CONFIG} from '../types/enums';

type Props = RootStackScreenProps<'History'>;

export default function HistoryScreen() {
  const route = useRoute<Props['route']>();
  const {t} = useTranslation();
  const {getSubtasksByEventId, restoreSubtask} = useRoutinesStore();
  const archived = getArchivedSubtasks(getSubtasksByEventId(route.params.eventId));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>{t('subtask.archived')}</Text>
        {archived.length === 0 ? (
          <Text style={styles.emptyText}>No archived subtasks</Text>
        ) : (
          archived.map(st => {
            const statusConfig = TASK_STATUS_CONFIG[TaskStatus.done];
            return (
              <View key={st.id} style={styles.itemRow}>
                <Text style={styles.itemEmoji}>{statusConfig.emoji}</Text>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{st.title}</Text>
                  <Text style={styles.itemMeta}>Completed {st.totalCompletions} times</Text>
                </View>
                <TouchableOpacity style={styles.restoreButton} onPress={() => restoreSubtask(st.id)}>
                  <Text style={styles.restoreText}>{t('subtask.restore')}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  scrollView: {flex: 1},
  title: {fontSize: 20, fontWeight: 'bold', padding: spacing.lg},
  emptyText: {textAlign: 'center', color: colors.gray400, marginTop: spacing.xl},
  itemRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.lg, borderRadius: borderRadius.lg},
  itemEmoji: {fontSize: 24, marginRight: spacing.md},
  itemContent: {flex: 1},
  itemTitle: {fontSize: 14, color: colors.textPrimaryLight},
  itemMeta: {fontSize: 12, color: colors.gray500, marginTop: spacing.xs},
  restoreButton: {padding: spacing.sm, backgroundColor: colors.gray100, borderRadius: borderRadius.md},
  restoreText: {fontSize: 12, color: colors.primary},
});