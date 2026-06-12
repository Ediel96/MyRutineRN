// src/screens/SettingsScreen.tsx
import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSettingsStore} from '../stores/settingsStore';
import {useRoutinesStore} from '../stores/routinesStore';
import {ScreenContainer, Card, Button} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {TabScreenProps} from '../navigation/types';
import {AppThemeMode, AppLanguage} from '../types/enums';

type Props = TabScreenProps<'Settings'>;

const LANGUAGE_EMOJI: Record<string, string> = {
  system: '📱',
  english: '🇬🇧',
  spanish: '🇪🇸',
  french: '🇫🇷',
};

export default function SettingsScreen({}: Props) {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {theme: appTheme, setTheme, language, setLanguage} = useSettingsStore();
  const {events, subtasks, completions} = useRoutinesStore();

  const handleResetData = () => {
    Alert.alert(
      t('settings.reset_data'),
      'Are you sure? This cannot be undone.',
      [
        {text: t('common.cancel'), style: 'cancel'},
        {text: t('common.delete'), style: 'destructive', onPress: () => {}},
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.theme')}</Text>
            <View style={styles.themeButtons}>
              {([AppThemeMode.system, AppThemeMode.light, AppThemeMode.dark] as const).map(m => (
                <TouchableOpacity key={m} style={[styles.themeButton, appTheme === m && styles.themeButtonActive]} onPress={() => setTheme(m)}>
                  <Text style={[styles.themeButtonText, appTheme === m && styles.themeButtonTextActive]}>{t(`settings.theme_${m}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <View style={styles.languageButtons}>
            {Object.values(AppLanguage).map(l => (
              <TouchableOpacity key={l} style={[styles.languageButton, language === l && styles.languageButtonActive]} onPress={() => setLanguage(l)}>
                <Text style={styles.languageEmoji}>{LANGUAGE_EMOJI[l]}</Text>
                <Text style={styles.languageName}>{t(`settings.theme_${l}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <View style={styles.statsGrid}>
            <Text style={styles.statLabel}>{t('stats.total_completed')}</Text>
            <Text style={styles.statValue}>{completions.length}</Text>
            <Text style={styles.statLabel}>Total Routines</Text>
            <Text style={styles.statValue}>{events.length}</Text>
            <Text style={styles.statLabel}>Total Subtasks</Text>
            <Text style={styles.statValue}>{subtasks.length}</Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.ai')}</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('AISettings')}>
            <Text style={styles.linkText}>{t('settings.ai_settings')}</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <TouchableOpacity style={[styles.linkRow, styles.linkRowBorder]} onPress={() => navigation.navigate('NotificationDiagnostics')}>
            <Text style={styles.linkText}>{t('settings.notification_diagnostics')}</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Logs')}>
            <Text style={styles.linkText}>{t('settings.logs')}</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        <Card style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>{t('settings.danger_zone')}</Text>
          <Button title={t('settings.reset_data')} variant="danger" onPress={handleResetData} />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: spacing.xxl},
    title: {fontSize: typography.title, fontWeight: typography.bold, color: colors.textPrimary, padding: spacing.lg},
    section: {marginHorizontal: spacing.lg, marginBottom: spacing.md},
    sectionTitle: {fontSize: typography.xs + 1, fontWeight: typography.semibold, color: colors.textSecondary, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5},
    row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    rowLabel: {fontSize: typography.lg, color: colors.textPrimary},
    themeButtons: {flexDirection: 'row', gap: spacing.xs},
    themeButton: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surfaceAlt},
    themeButtonActive: {backgroundColor: colors.primary},
    themeButtonText: {fontSize: typography.xs + 1, color: colors.textPrimary},
    themeButtonTextActive: {color: colors.white, fontWeight: typography.semibold},
    languageButtons: {flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap'},
    languageButton: {alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt, minWidth: 60},
    languageButtonActive: {backgroundColor: colors.primary + '26', borderWidth: 1, borderColor: colors.primary},
    languageEmoji: {fontSize: 24},
    languageName: {fontSize: typography.xs, marginTop: spacing.xs, color: colors.textSecondary},
    statsGrid: {flexDirection: 'row', flexWrap: 'wrap'},
    statLabel: {width: '50%', fontSize: typography.md, color: colors.textSecondary, marginBottom: spacing.xs},
    statValue: {width: '50%', fontSize: typography.md, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.xs},
    linkRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, minHeight: 44},
    linkRowBorder: {borderBottomWidth: 1, borderBottomColor: colors.border},
    linkText: {fontSize: typography.lg, color: colors.textPrimary},
    linkArrow: {fontSize: typography.xxl, color: colors.textTertiary},
    dangerSection: {borderColor: colors.error + '40'},
    dangerTitle: {color: colors.error},
  });
