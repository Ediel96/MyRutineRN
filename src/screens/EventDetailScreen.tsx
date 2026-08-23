// src/screens/EventDetailScreen.tsx
import React, {useState} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore, getActiveSubtasks, getArchivedSubtasks, getSubtasksProgress} from '../stores/routinesStore';
import {ScreenContainer, Card, Badge, Button} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {EventCategory, TaskStatus, ViewMode} from '../types/enums';
import {EVENT_CATEGORY_CONFIG, TASK_STATUS_CONFIG} from '../types/enums';

type Props = RootStackScreenProps<'EventDetail'>;

export default function EventDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Props['route']>();
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {getEventById, getSubtasksByEventId, advanceSubtaskStatus, toggleCompletedToday, isCompletedToday, deleteEvent} = useRoutinesStore();

  const event = getEventById(route.params.eventId);
  const subtasks = getSubtasksByEventId(route.params.eventId);
  const activeSubtasks = getActiveSubtasks(subtasks);
  const archivedSubtasks = getArchivedSubtasks(subtasks);
  const progress = getSubtasksProgress(subtasks);
  const completed = event ? isCompletedToday(event.id) : false;
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.list);

  if (!event) return <ScreenContainer><Text style={styles.notFound}>Event not found</Text></ScreenContainer>;

  const categoryConfig = EVENT_CATEGORY_CONFIG[event.categoryRaw as EventCategory];

  // Borra esta rutina y, en cascada, sus subtareas, sus registros de completado
  // y sus notificaciones programadas (lo hace routinesStore.deleteEvent).
  const handleDelete = () => {
    Alert.alert(t('routine.delete'), t('routine.delete_confirm'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteEvent(event.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.headerCard} borderLeftColor={categoryConfig?.color}>
          <Text style={styles.title}>{categoryConfig?.emoji} {event.title}</Text>
          <Text style={styles.time}>{event.startTime} - {event.endTime}</Text>
          <Badge label={categoryConfig?.displayName || ''} color={categoryConfig?.color} style={styles.categoryBadge} />
        </Card>

        {event.routineDescription && <Card style={styles.infoBlock}><Text style={styles.infoLabel}>{t('routine.description')}</Text><Text style={styles.infoValue}>{event.routineDescription}</Text></Card>}
        {event.purpose && <Card style={styles.infoBlock}><Text style={styles.infoLabel}>{t('routine.purpose')}</Text><Text style={styles.infoValue}>{event.purpose}</Text></Card>}
        {event.objectives && <Card style={styles.infoBlock}><Text style={styles.infoLabel}>{t('routine.objectives')}</Text><Text style={styles.infoValue}>{event.objectives}</Text></Card>}

        <Card style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.progressBar}><View style={[styles.progressFill, {width: `${progress * 100}%`}]} /></View>
          <Text style={styles.progressText}>{activeSubtasks.length} active, {archivedSubtasks.length} archived</Text>
        </Card>

        <View style={styles.modeToggle}>
          <TouchableOpacity style={[styles.modeButton, styles.modeButtonLeft, viewMode === ViewMode.list && styles.modeButtonActive]} onPress={() => setViewMode(ViewMode.list)}>
            <Text style={[styles.modeButtonText, viewMode === ViewMode.list && styles.modeButtonTextActive]}>📋 List</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeButton, styles.modeButtonRight, viewMode === ViewMode.board && styles.modeButtonActive]} onPress={() => setViewMode(ViewMode.board)}>
            <Text style={[styles.modeButtonText, viewMode === ViewMode.board && styles.modeButtonTextActive]}>📊 Board</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.subtasksSection}>
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
        </Card>

        {archivedSubtasks.length > 0 && (
          <Card style={styles.subtasksSection}>
            <TouchableOpacity onPress={() => navigation.navigate('History', {eventId: event.id})}>
              <Text style={styles.sectionTitle}>{t('subtask.archived')} ({archivedSubtasks.length}) →</Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>

      <View style={styles.toolbar}>
        <Button title="✏️ Edit" variant="secondary" onPress={() => navigation.navigate('EventEditor', {eventId: event.id})} style={styles.toolbarButton} />
        <Button title={completed ? '✓ Completed' : '○ Mark Complete'} variant={completed ? 'primary' : 'secondary'} onPress={() => toggleCompletedToday(event.id)} style={styles.toolbarButton} />
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel={t('routine.delete')}>
          <Text style={styles.deleteButtonText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography, shadows}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: spacing.xxl},
    notFound: {color: colors.textPrimary, padding: spacing.lg},
    headerCard: {margin: spacing.lg, ...shadows.md},
    title: {fontSize: typography.headline, fontWeight: typography.bold, color: colors.textPrimary},
    time: {fontSize: typography.md, color: colors.textSecondary, marginTop: spacing.xs},
    categoryBadge: {marginTop: spacing.sm},
    infoBlock: {marginHorizontal: spacing.lg, marginBottom: spacing.sm},
    infoLabel: {fontSize: typography.xs + 1, color: colors.textSecondary, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5},
    infoValue: {fontSize: typography.md, color: colors.textPrimary},
    progressSection: {margin: spacing.lg},
    sectionTitle: {fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.md},
    progressBar: {height: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.full, overflow: 'hidden'},
    progressFill: {height: '100%', backgroundColor: colors.success, borderRadius: radius.full},
    progressText: {fontSize: typography.sm, color: colors.textSecondary, marginTop: spacing.xs},
    modeToggle: {flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.surfaceAlt, borderRadius: radius.full, padding: 4},
    modeButton: {flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.full},
    modeButtonLeft: {},
    modeButtonRight: {},
    modeButtonActive: {backgroundColor: colors.primary},
    modeButtonText: {color: colors.textSecondary, fontWeight: typography.medium},
    modeButtonTextActive: {color: colors.white, fontWeight: typography.semibold},
    subtasksSection: {marginHorizontal: spacing.lg, marginBottom: spacing.md},
    emptyText: {color: colors.textTertiary, fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing.lg},
    subtaskRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border},
    subtaskEmoji: {fontSize: typography.xl, marginRight: spacing.md},
    subtaskContent: {flex: 1},
    subtaskTitle: {fontSize: typography.md, color: colors.textPrimary},
    subtaskDetail: {fontSize: typography.sm, color: colors.textSecondary},
    subtaskPom: {fontSize: typography.sm, color: colors.textSecondary},
    addButton: {alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm},
    addButtonText: {color: colors.primary, fontWeight: typography.semibold},
    toolbar: {flexDirection: 'row', padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border},
    toolbarButton: {flex: 1},
    deleteButton: {
      width: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.error,
    },
    deleteButtonText: {fontSize: typography.lg},
  });
