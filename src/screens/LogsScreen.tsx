// src/screens/LogsScreen.tsx
import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import {logger} from '../services/logger';
import {ScreenContainer, Card} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {LogLevel} from '../types/enums';

type Props = RootStackScreenProps<'Logs'>;

export default function LogsScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const logs = logger.getAllLogs();

  const getLevelColor = (level: string) => {
    switch (level) {
      case LogLevel.error:
      case LogLevel.critical: return theme.colors.error;
      case LogLevel.warning: return theme.colors.warning;
      case LogLevel.info: return theme.colors.info;
      default: return theme.colors.textTertiary;
    }
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>{t('logs.no_logs')}</Text>
        ) : (
          logs.slice().reverse().map(log => (
            <Card key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={[styles.logLevel, {color: getLevelColor(log.levelRaw)}]}>{log.levelRaw.toUpperCase()}</Text>
                <Text style={styles.logDate}>{new Date(log.date).toLocaleString()}</Text>
              </View>
              <Text style={styles.logMessage}>{log.message}</Text>
              <Text style={styles.logFunction}>in {log.function}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, typography}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {padding: spacing.lg},
    emptyText: {textAlign: 'center', color: colors.textTertiary, marginTop: spacing.xl},
    logItem: {marginBottom: spacing.sm},
    logHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs},
    logLevel: {fontSize: typography.xs, fontWeight: typography.bold},
    logDate: {fontSize: typography.xs, color: colors.textTertiary},
    logMessage: {fontSize: typography.sm + 1, color: colors.textPrimary},
    logFunction: {fontSize: typography.xs + 1, color: colors.textTertiary, marginTop: spacing.xs},
  });
