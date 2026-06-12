// src/screens/NotificationDiagnosticsScreen.tsx
import React, {useEffect, useState} from 'react';
import {Text, StyleSheet, ScrollView, Alert} from 'react-native';
import {useTranslation} from 'react-i18next';
import {sendTestNotification} from '../services/notifications';
import {ScreenContainer, Card, Button} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';
import type {PendingNotification} from '../types/models';

type Props = RootStackScreenProps<'NotificationDiagnostics'>;

export default function NotificationDiagnosticsScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const [pending, setPending] = useState<PendingNotification[]>([]);

  useEffect(() => {
    // Load pending notifications
  }, []);

  const handleTestNotification = async () => {
    await sendTestNotification();
    Alert.alert('Test notification sent!');
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('notification_diagnostics.title')}</Text>
          <Text style={styles.count}>{t('notification_diagnostics.pending', {count: pending.length})}</Text>
          {pending.length === 0 && <Text style={styles.emptyText}>{t('notification_diagnostics.no_pending')}</Text>}
        </Card>
        <Card style={styles.section}>
          <Button title={t('notification_diagnostics.send_test')} onPress={handleTestNotification} />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, typography}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {padding: spacing.lg},
    section: {marginBottom: spacing.md},
    sectionTitle: {fontSize: typography.xl, fontWeight: typography.bold, color: colors.textPrimary, marginBottom: spacing.md},
    count: {fontSize: typography.md, color: colors.textSecondary},
    emptyText: {color: colors.textTertiary, fontStyle: 'italic', marginTop: spacing.md},
  });
