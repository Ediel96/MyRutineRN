// src/screens/SettingsScreen.tsx
import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSettingsStore} from '../stores/settingsStore';
import {useRoutinesStore} from '../stores/routinesStore';
import {colors, spacing, borderRadius, shadows} from '../theme/AppTheme';
import type {TabScreenProps} from '../navigation/types';
import {AppThemeMode, AppLanguage} from '../types/enums';

type Props = TabScreenProps<'Settings'>;

export default function SettingsScreen({}: Props) {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const {theme, setTheme} = useSettingsStore();
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.theme')}</Text>
            <View style={styles.themeButtons}>
              {([AppThemeMode.system, AppThemeMode.light, AppThemeMode.dark] as const).map(m => (
                <TouchableOpacity key={m} style={[styles.themeButton, theme === m && styles.themeButtonActive]} onPress={() => setTheme(m)}>
                  <Text style={[styles.themeButtonText, theme === m && styles.themeButtonTextActive]}>{t(`settings.theme_${m}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          <View style={styles.languageButtons}>
            {Object.values(AppLanguage).map(l => (
              <TouchableOpacity key={l} style={styles.languageButton}>
                <Text style={styles.languageEmoji}>{l === 'system' ? '📱' : l === 'english' ? '🇬🇧' : l === 'spanish' ? '🇪🇸' : '🇫🇷'}</Text>
                <Text style={styles.languageName}>{t(`settings.theme_${l}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
          <View style={styles.statsGrid}>
            <Text style={styles.statLabel}>{t('stats.total_completed')}</Text>
            <Text style={styles.statValue}>{completions.length}</Text>
            <Text style={styles.statLabel}>Total Routines</Text>
            <Text style={styles.statValue}>{events.length}</Text>
            <Text style={styles.statLabel}>Total Subtasks</Text>
            <Text style={styles.statValue}>{subtasks.length}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.ai')}</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('AISettings')}>
            <Text style={styles.linkText}>{t('settings.ai_settings')}</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('NotificationDiagnostics')}>
            <Text style={styles.linkText}>{t('settings.notification_diagnostics')}</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('Logs')}>
            <Text style={styles.linkText}>{t('settings.logs')}</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, styles.dangerSection]}>
          <Text style={styles.sectionTitle}>{t('settings.danger_zone')}</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleResetData}>
            <Text style={styles.dangerButtonText}>{t('settings.reset_data')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  scrollView: {flex: 1},
  title: {fontSize: 24, fontWeight: 'bold', color: colors.textPrimaryLight, padding: spacing.lg},
  section: {backgroundColor: colors.white, marginBottom: spacing.md, padding: spacing.lg},
  sectionTitle: {fontSize: 14, fontWeight: '600', color: colors.gray500, marginBottom: spacing.md, textTransform: 'uppercase'},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  rowLabel: {fontSize: 16, color: colors.textPrimaryLight},
  themeButtons: {flexDirection: 'row', gap: spacing.xs},
  themeButton: {paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.gray100},
  themeButtonActive: {backgroundColor: colors.primary},
  themeButtonText: {fontSize: 12, color: colors.textPrimaryLight},
  themeButtonTextActive: {color: colors.white},
  languageButtons: {flexDirection: 'row', gap: spacing.md},
  languageButton: {alignItems: 'center'},
  languageEmoji: {fontSize: 24},
  languageName: {fontSize: 10, marginTop: spacing.xs},
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  statLabel: {width: '50%', fontSize: 14, color: colors.gray600},
  statValue: {width: '50%', fontSize: 14, fontWeight: '600', color: colors.textPrimaryLight},
  linkRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100},
  linkText: {fontSize: 16, color: colors.textPrimaryLight},
  linkArrow: {fontSize: 20, color: colors.gray400},
  dangerSection: {backgroundColor: colors.error + '10'},
  dangerButton: {backgroundColor: colors.error, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center'},
  dangerButtonText: {color: colors.white, fontWeight: '600'},
});