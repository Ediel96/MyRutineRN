// src/screens/NotificationDiagnosticsScreen.tsx
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {useTranslation} from 'react-i18next';
import {sendTestNotification} from '../services/notifications';
import {colors, spacing, borderRadius} from '../theme/AppTheme';
import type {RootStackScreenProps} from '../navigation/types';
import type {PendingNotification} from '../types/models';

type Props = RootStackScreenProps<'NotificationDiagnostics'>;

export default function NotificationDiagnosticsScreen() {
  const {t} = useTranslation();
  const [pending, setPending] = useState<PendingNotification[]>([]);

  useEffect(() => {
    // Load pending notifications
  }, []);

  const handleTestNotification = async () => {
    await sendTestNotification();
    Alert.alert('Test notification sent!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notification_diagnostics.title')}</Text>
          <Text style={styles.count}>{t('notification_diagnostics.pending', {count: pending.length})}</Text>
          {pending.length === 0 && <Text style={styles.emptyText}>{t('notification_diagnostics.no_pending')}</Text>}
        </View>
        <View style={styles.section}>
          <TouchableOpacity style={styles.testButton} onPress={handleTestNotification}>
            <Text style={styles.testButtonText}>{t('notification_diagnostics.send_test')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  scrollView: {flex: 1},
  section: {backgroundColor: colors.white, marginBottom: spacing.md, padding: spacing.lg},
  sectionTitle: {fontSize: 18, fontWeight: 'bold', marginBottom: spacing.md},
  count: {fontSize: 14, color: colors.gray600},
  emptyText: {color: colors.gray400, fontStyle: 'italic', marginTop: spacing.md},
  testButton: {backgroundColor: colors.primary, padding: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center'},
  testButtonText: {color: colors.white, fontWeight: '600'},
});