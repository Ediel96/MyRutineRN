// src/screens/EventDetailScreen.tsx
import React, {useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore, getActiveSubtasks, getArchivedSubtasks, getSubtasksProgress} from '../stores/routinesStore';
import {colors, spacing, borderRadius, shadows} from '../theme/AppTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {EventCategory, TaskStatus, ViewMode} from '../types/enums';
import {EVENT_CATEGORY_CONFIG, TASK_STATUS_CONFIG} from '../types/enums';

type Props = RootStackScreenProps<'EventDetail'>;

export default function EventDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const {t} = useTranslation();
  const {getEventById, getSubtasksByEventId, advanceSubtaskStatus, toggleCompletedToday, isCompletedToday} = useRoutinesStore();

  const event = getEventById(route.params.eventId);
  const subtasks = getSubtasksByEventId(route.params.eventId);
  const activeSubtasks = getActiveSubtasks(subtasks);
  const archivedSubtasks = getArchivedSubtasks(subtasks);
  const progress = getSubtasksProgress(subtasks);
  const completed = event ? isCompletedToday(event.id) : false;
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.list);

  if (!event) return <Text>Event not found</Text>;

  const categoryConfig = EVENT_CATEGORY_CONFIG[event.categoryRaw as EventCategory];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.headerCard, {borderLeftColor: categoryConfig?.color}]}>
          <Text style={styles.title}>{categoryConfig?.emoji} {event.title}</Text>
          <Text style={styles.time}>{event.startTime} - {event.endTime}</Text>
          <View style={[styles.categoryBadge, {backgroundColor: categoryConfig?.color + '20'}]}>
            <Text style={[styles.categoryText, {color: categoryConfig?.color}]}>{categoryConfig?.displayName}</Text>
          </View>
        </View>

        {event.routineDescription && <View style={styles.infoBlock}><Text style={styles.infoLabel}>{t('routine.description')}</Text><Text style={styles.infoValue}>{event.routineDescription}</Text></View>}
        {event.purpose && <View style={styles.infoBlock}><Text style={styles.infoLabel}>{t('routine.purpose')}</Text><Text style={styles.infoValue}>{event.purpose}</Text></View>}
        {event.objectives && <View style={styles.infoBlock}><Text style={styles.infoLabel}>{t('routine.objectives')}</Text><Text style={styles.infoValue}>{event.objectives}</Text></View>}

        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.progressBar}><View style={[styles.progressFill, {width: `${progress * 100}%`}]} /></View>
          <Text style={styles.progressText}>{activeSubtasks.length} active, {archivedSubtasks.length} archived</Text>
        </View>

        <View style={styles.modeToggle}>
          <TouchableOpacity style={[styles.modeButton, viewMode === ViewMode.list && styles.modeButtonActive]} onPress={() => setViewMode(ViewMode.list)}><Text>📋 List</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modeButton, viewMode === ViewMode.board && styles.modeButtonActive]} onPress={() => setViewMode(ViewMode.board)}><Text>📊 Board</Text></TouchableOpacity>
        </View>

        <View style={styles.subtasksSection}>
          <Text style={styles.sectionTitle}>Subtasks</Text>
          {activeSubtasks.length === 0 ? (
            <Text style={styles.emptyText}>{t('subtask.add_first')}</Text>
          ) : (
            activeSubtasks.map(st => {
              const statusConfig = TASK_STATUS_CONFIG[st.statusRaw as TaskStatus];
              return (
                <TouchableOpacity key={st.id} style={styles.subtaskRow} onPress={() => advanceSubtaskStatus(st.id)}>
                  <Text style={styles.subtaskEmoji}>{statusConfig.emoji}</Text>
                  <View style={styles.subtaskContent}>
                    <Text style={styles.subtaskTitle}>{st.title}</Text>
                    {st.detail && <Text style={styles.subtaskDetail}>{st.detail}</Text>}
                  </View>
                  {st.pomodoroMinutes && <Text style={styles.subtaskPom}>🍅{st.pomodoroMinutes}m</Text>}
                </TouchableOpacity>
              );
            })
          )}
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('SubtaskEditor', {eventId: event.id})}>
            <Text style={styles.addButtonText}>+ Add Subtask</Text>
          </TouchableOpacity>
        </View>

        {archivedSubtasks.length > 0 && (
          <View style={styles.subtasksSection}>
            <TouchableOpacity onPress={() => navigation.navigate('History', {eventId: event.id})}>
              <Text style={styles.sectionTitle}>{t('subtask.archived')} ({archivedSubtasks.length}) →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => navigation.navigate('EventEditor', {eventId: event.id})}><Text>✏️ Edit</Text></TouchableOpacity>
        <TouchableOpacity style={styles.toolbarButton} onPress={() => toggleCompletedToday(event.id)}><Text>{completed ? '✓ Completed' : '○ Mark Complete'}</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  scrollView: {flex: 1},
  headerCard: {backgroundColor: colors.white, margin: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg, borderLeftWidth: 4, ...shadows.md},
  title: {fontSize: 22, fontWeight: 'bold', color: colors.textPrimaryLight},
  time: {fontSize: 14, color: colors.gray600, marginTop: spacing.xs},
  categoryBadge: {alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md, marginTop: spacing.sm},
  categoryText: {fontSize: 12, fontWeight: '600'},
  infoBlock: {backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md},
  infoLabel: {fontSize: 12, color: colors.gray500, marginBottom: spacing.xs},
  infoValue: {fontSize: 14, color: colors.textPrimaryLight},
  progressSection: {backgroundColor: colors.white, margin: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg},
  sectionTitle: {fontSize: 16, fontWeight: '600', color: colors.textPrimaryLight, marginBottom: spacing.md},
  progressBar: {height: 8, backgroundColor: colors.gray200, borderRadius: 4},
  progressFill: {height: '100%', backgroundColor: colors.success, borderRadius: 4},
  progressText: {fontSize: 12, color: colors.gray500, marginTop: spacing.xs},
  modeToggle: {flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md},
  modeButton: {flex: 1, padding: spacing.md, alignItems: 'center', backgroundColor: colors.gray100},
  modeButtonActive: {backgroundColor: colors.primary},
  subtasksSection: {backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: borderRadius.lg},
  emptyText: {color: colors.gray400, fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing.lg},
  subtaskRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.gray100},
  subtaskEmoji: {fontSize: 20, marginRight: spacing.md},
  subtaskContent: {flex: 1},
  subtaskTitle: {fontSize: 14, color: colors.textPrimaryLight},
  subtaskDetail: {fontSize: 12, color: colors.gray500},
  subtaskPom: {fontSize: 12, color: colors.gray500},
  addButton: {alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm},
  addButtonText: {color: colors.primary, fontWeight: '600'},
  toolbar: {flexDirection: 'row', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray200},
  toolbarButton: {flex: 1, padding: spacing.md, alignItems: 'center', backgroundColor: colors.gray100, borderRadius: borderRadius.md},
});