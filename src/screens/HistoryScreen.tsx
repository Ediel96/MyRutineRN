// src/screens/HistoryScreen.tsx
import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore, getArchivedSubtasks} from '../stores/routinesStore';
import {ScreenContainer, Card, Button} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {TaskStatus} from '../types/enums';
import {TASK_STATUS_CONFIG} from '../types/enums';

type Props = RootStackScreenProps<'History'>;

export default function HistoryScreen() {
  const route = useRoute<Props['route']>();
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {getSubtasksByEventId, restoreSubtask} = useRoutinesStore();
  const archived = getArchivedSubtasks(getSubtasksByEventId(route.params.eventId));

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('subtask.archived')}</Text>
        {archived.length === 0 ? (
          <Text style={styles.emptyText}>No archived subtasks</Text>
        ) : (
          archived.map(st => {
            const statusConfig = TASK_STATUS_CONFIG[TaskStatus.done];
            return (
              <Card key={st.id} style={styles.itemRow}>
                <Text style={styles.itemEmoji}>{statusConfig.emoji}</Text>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{st.title}</Text>
                  <Text style={styles.itemMeta}>Completed {st.totalCompletions} times</Text>
                </View>
                <Button title={t('subtask.restore')} variant="tertiary" onPress={() => restoreSubtask(st.id)} fullWidth={false} />
              </Card>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, typography}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {padding: spacing.lg},
    title: {fontSize: typography.xxl, fontWeight: typography.bold, color: colors.textPrimary, marginBottom: spacing.lg},
    emptyText: {textAlign: 'center', color: colors.textTertiary, marginTop: spacing.xl},
    itemRow: {flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm},
    itemEmoji: {fontSize: 24, marginRight: spacing.md},
    itemContent: {flex: 1},
    itemTitle: {fontSize: typography.md, color: colors.textPrimary, fontWeight: typography.medium},
    itemMeta: {fontSize: typography.sm, color: colors.textTertiary, marginTop: spacing.xs},
  });
