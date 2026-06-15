// src/screens/SettingsScreen.tsx
import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSettingsStore} from '../stores/settingsStore';
import {useRoutinesStore} from '../stores/routinesStore';
import {ScreenContainer} from '../components/ui';
import {SettingsCard, SettingsNavRow, ThemeSegmentedControl, LanguageSelector} from '../components/settings';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {TabScreenProps} from '../navigation/types';
import {AppThemeMode, AppLanguage, APP_LANGUAGE_CONFIG} from '../types/enums';

type Props = TabScreenProps<'Settings'>;

// Nombres de idioma — datos estáticos de APP_LANGUAGE_CONFIG, NO pasan por i18n
// (el nombre nativo de un idioma no se traduce según el idioma de la UI).
const LANGUAGE_OPTIONS = Object.values(AppLanguage).map(value => ({
  value,
  emoji: APP_LANGUAGE_CONFIG[value].emoji,
  nativeName: APP_LANGUAGE_CONFIG[value].displayName,
}));

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

  const THEME_OPTIONS = [
    {value: AppThemeMode.system, label: t('settings.theme_system')},
    {value: AppThemeMode.light, label: t('settings.theme_light')},
    {value: AppThemeMode.dark, label: t('settings.theme_dark')},
  ];

  const ABOUT_STATS = [
    {emoji: '✅', label: t('stats.total_completed'), value: completions.length, color: '#4ADE80'},
    {emoji: '📋', label: t('settings.total_routines'), value: events.length, color: theme.colors.primary},
    {emoji: '📝', label: t('settings.total_subtasks'), value: subtasks.length, color: theme.colors.accentWarm},
  ];

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('settings.title')}</Text>

        <SettingsCard title={t('settings.appearance')}>
          <View style={styles.themeRow}>
            <Text style={styles.themeLabel}>{t('settings.theme')}</Text>
            <ThemeSegmentedControl options={THEME_OPTIONS} selected={appTheme} onSelect={setTheme} />
          </View>
        </SettingsCard>

        <SettingsCard title={t('settings.language')}>
          <LanguageSelector options={LANGUAGE_OPTIONS} selected={language} onSelect={setLanguage} />
        </SettingsCard>

        <SettingsCard title={t('settings.about')}>
          {ABOUT_STATS.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <View style={styles.statRow}>
                <View style={[styles.statIcon, {backgroundColor: `${stat.color}26`}]}>
                  <Text style={styles.statEmoji}>{stat.emoji}</Text>
                </View>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={[styles.statValue, {color: stat.color}]}>{stat.value}</Text>
              </View>
              {i < ABOUT_STATS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </SettingsCard>

        <SettingsCard title={t('settings.advanced')}>
          <SettingsNavRow
            icon="🤖"
            iconBg={theme.colors.accentAI}
            label={t('settings.ai_settings')}
            onPress={() => navigation.navigate('AISettings')}
          />
          <SettingsNavRow
            icon="🔔"
            iconBg={theme.colors.accentWarm}
            label={t('settings.notification_diagnostics')}
            onPress={() => navigation.navigate('NotificationDiagnostics')}
          />
          <SettingsNavRow
            icon="📋"
            iconBg={theme.colors.primaryAlt}
            label={t('settings.logs')}
            onPress={() => navigation.navigate('Logs')}
            showDivider={false}
          />
        </SettingsCard>

        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>⚠️  {t('settings.danger_zone')}</Text>
          <TouchableOpacity
            onPress={handleResetData}
            activeOpacity={0.8}
            style={styles.dangerBtn}
            accessibilityLabel={t('settings.reset_data')}
            accessibilityRole="button">
            <Text style={styles.dangerBtnText}>{t('settings.reset_data')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: spacing.xxl},
    title: {fontSize: typography.title, fontWeight: typography.bold, color: colors.textPrimary, padding: spacing.lg},

    themeRow: {paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm},
    themeLabel: {fontSize: typography.md, fontWeight: typography.medium, color: colors.textPrimary, marginBottom: spacing.xs},

    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
      minHeight: 52,
    },
    statIcon: {
      width: 34,
      height: 34,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    statEmoji: {fontSize: 16},
    statLabel: {flex: 1, fontSize: typography.md, color: colors.textSecondary, fontWeight: typography.medium},
    statValue: {fontSize: typography.lg, fontWeight: typography.bold},
    divider: {height: 0.5, backgroundColor: colors.border, marginHorizontal: spacing.md},

    dangerCard: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      backgroundColor: `${colors.error}14`,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: `${colors.error}38`,
      padding: spacing.md,
    },
    dangerTitle: {
      fontSize: typography.xs,
      fontWeight: typography.semibold,
      color: colors.error,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: spacing.md,
    },
    dangerBtn: {
      borderWidth: 1.5,
      borderColor: colors.error,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      backgroundColor: `${colors.error}1A`,
    },
    dangerBtnText: {
      fontSize: typography.md,
      fontWeight: typography.semibold,
      color: colors.error,
    },
  });
