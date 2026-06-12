// src/screens/LogsScreen.tsx
import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import {logger} from '../services/logger';
import {colors, spacing, borderRadius} from '../theme/AppTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {LogLevel} from '../types/enums';

type Props = RootStackScreenProps<'Logs'>;

export default function LogsScreen() {
  const {t} = useTranslation();
  const logs = logger.getAllLogs();

  const getLevelColor = (level: string) => {
    switch (level) {
      case LogLevel.error:
      case LogLevel.critical: return colors.error;
      case LogLevel.warning: return colors.warning;
      case LogLevel.info: return colors.info;
      default: return colors.gray500;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>{t('logs.no_logs')}</Text>
        ) : (
          logs.slice().reverse().map(log => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <Text style={[styles.logLevel, {color: getLevelColor(log.levelRaw)}]}>{log.levelRaw.toUpperCase()}</Text>
                <Text style={styles.logDate}>{new Date(log.date).toLocaleString()}</Text>
              </View>
              <Text style={styles.logMessage}>{log.message}</Text>
              <Text style={styles.logFunction}>in {log.function}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  scrollView: {flex: 1},
  emptyText: {textAlign: 'center', color: colors.gray400, marginTop: spacing.xl, padding: spacing.lg},
  logItem: {backgroundColor: colors.white, marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md},
  logHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs},
  logLevel: {fontSize: 10, fontWeight: 'bold'},
  logDate: {fontSize: 10, color: colors.gray400},
  logMessage: {fontSize: 13, color: colors.textPrimaryLight},
  logFunction: {fontSize: 11, color: colors.gray500, marginTop: spacing.xs},
});