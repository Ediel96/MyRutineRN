// src/components/NonNegotiablesCard.tsx
// Tarjeta de No Negociables en TodayScreen. Ver docs/no-negociables.md 4.3.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, Pressable, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {useNonNegotiablesStore} from '../stores/nonNegotiablesStore';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {NonNegotiableStatus} from '../types/nonNegotiable';

const HAPTIC = {enableVibrateFallback: false, ignoreAndroidSystemSettings: false};

const STATUS_EMOJI: Record<NonNegotiableStatus, string> = {
  done: '😀',
  missed: '😔',
  pending: '⚪',
};

export default function NonNegotiablesCard() {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();

  const {
    enabled,
    hour,
    minute,
    loadData,
    ensureTodayRecords,
    setStatus,
    getTodayEntries,
    getStreak,
  } = useNonNegotiablesStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const entries = getTodayEntries();
  const streak = getStreak();

  // Antes de la hora la tarjeta va colapsada: pedir el balance del día a las
  // 8 de la mañana no tiene sentido. Pero la hora es solo un recordatorio, así
  // que se puede desplegar a mano en cualquier momento (P4).
  const isAfterReminder = useMemo(() => {
    const now = new Date();
    return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
  }, [hour, minute]);

  const [manuallyOpen, setManuallyOpen] = useState(false);
  const expanded = isAfterReminder || manuallyOpen;

  const handleRespond = useCallback(
    (id: string, status: NonNegotiableStatus) => {
      ReactNativeHapticFeedback.trigger(
        status === 'done' ? 'impactMedium' : 'impactLight',
        HAPTIC,
      );
      ensureTodayRecords();
      setStatus(id, status);
    },
    [ensureTodayRecords, setStatus],
  );

  if (!enabled) return null;

  // Activo pero sin ninguno creado: tarjeta compacta con CTA.
  if (entries.length === 0) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('NonNegotiablesSettings' as never)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('non_negotiables.empty_cta')}>
        <Text style={styles.headerTitle}>🎯 {t('non_negotiables.title')}</Text>
        <Text style={styles.emptyText}>{t('non_negotiables.empty_title')}</Text>
        <Text style={styles.emptyCta}>{t('non_negotiables.empty_cta')} →</Text>
      </TouchableOpacity>
    );
  }

  const doneCount = entries.filter(e => e.status === 'done').length;

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.header}
        onPress={() => setManuallyOpen(o => !o)}
        accessibilityRole="button"
        accessibilityState={{expanded}}>
        <Text style={styles.headerTitle}>🎯 {t('non_negotiables.title')}</Text>
        <View style={styles.headerRight}>
          {streak > 0 && (
            <Text style={styles.streak}>
              🔥 {t('non_negotiables.streak_days', {count: streak})}
            </Text>
          )}
          <Text style={styles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
        </View>
      </Pressable>

      {!expanded ? (
        <Text style={styles.collapsedSummary}>
          {doneCount}/{entries.length}
        </Text>
      ) : (
        <View style={styles.list}>
          {entries.map(({item, status}) => (
            <View
              key={item.id}
              style={[styles.row, status === 'missed' && styles.rowMissed]}>
              <Text style={styles.rowEmoji}>{item.emoji}</Text>
              <Text
                style={[styles.rowTitle, status === 'missed' && styles.rowTitleMissed]}
                numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.statusEmoji}>{STATUS_EMOJI[status]}</Text>

              <TouchableOpacity
                style={[styles.btn, status === 'done' && styles.btnDoneActive]}
                onPress={() => handleRespond(item.id, 'done')}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}: ${t('non_negotiables.done')}`}
                accessibilityState={{selected: status === 'done'}}>
                <Text style={[styles.btnText, status === 'done' && styles.btnTextActive]}>
                  ✓
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, status === 'missed' && styles.btnMissedActive]}
                onPress={() => handleRespond(item.id, 'missed')}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}: ${t('non_negotiables.missed')}`}
                accessibilityState={{selected: status === 'missed'}}>
                <Text
                  style={[styles.btnText, status === 'missed' && styles.btnTextActive]}>
                  ✗
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = ({colors, spacing, radius, typography, shadows, minTapSize}: AppTheme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      padding: spacing.lg,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: typography.lg,
      fontWeight: typography.semibold,
      color: colors.textPrimary,
    },
    headerRight: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    streak: {
      fontSize: typography.sm,
      fontWeight: typography.semibold,
      color: colors.accentWarm,
    },
    chevron: {fontSize: typography.md, color: colors.textTertiary},
    collapsedSummary: {
      marginTop: spacing.xs,
      fontSize: typography.sm,
      color: colors.textSecondary,
    },

    list: {marginTop: spacing.md, gap: spacing.sm},
    row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
    rowMissed: {opacity: 0.55},
    rowEmoji: {fontSize: typography.lg},
    rowTitle: {flex: 1, fontSize: typography.md, color: colors.textPrimary},
    rowTitleMissed: {textDecorationLine: 'line-through'},
    statusEmoji: {fontSize: typography.lg},

    btn: {
      width: minTapSize - 8,
      height: minTapSize - 8,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    btnDoneActive: {backgroundColor: colors.success, borderColor: colors.success},
    btnMissedActive: {backgroundColor: colors.error, borderColor: colors.error},
    btnText: {fontSize: typography.md, color: colors.textSecondary},
    btnTextActive: {color: colors.white, fontWeight: typography.bold},

    emptyText: {marginTop: spacing.sm, fontSize: typography.md, color: colors.textSecondary},
    emptyCta: {
      marginTop: spacing.xs,
      fontSize: typography.sm,
      fontWeight: typography.semibold,
      color: colors.primary,
    },
  });
