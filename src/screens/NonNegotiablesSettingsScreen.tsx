// src/screens/NonNegotiablesSettingsScreen.tsx
// Configuración de No Negociables. Ver docs/no-negociables.md 4.1.

import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useNonNegotiablesStore} from '../stores/nonNegotiablesStore';
import {activeNonNegotiables} from '../services/nonNegotiablesLogic';
import {ScreenContainer, Card, Button} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import {MAX_ACTIVE_NON_NEGOTIABLES} from '../types/nonNegotiable';
import type {RootStackScreenProps} from '../navigation/types';

const pad = (n: number) => n.toString().padStart(2, '0');

export default function NonNegotiablesSettingsScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation =
    useNavigation<RootStackScreenProps<'NonNegotiablesSettings'>['navigation']>();

  const {
    items,
    enabled,
    hour,
    minute,
    setEnabled,
    setTime,
    setItemActive,
    deleteAll,
    getStats,
    canAddMore,
  } = useNonNegotiablesStore();

  const [showPicker, setShowPicker] = useState(false);
  const active = activeNonNegotiables(items);

  const onTimeChange = useCallback(
    (event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === 'android') setShowPicker(false);
      if (event.type === 'dismissed' || !selected) return;
      setTime(selected.getHours(), selected.getMinutes());
    },
    [setTime],
  );

  const timeAsDate = useMemo(() => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
  }, [hour, minute]);

  // Desactiva en vez de borrar: el historial de los días en que existía debe
  // seguir siendo válido, y los registros son la fuente de verdad de qué se
  // exigía cada día. Desactivar libera cupo al instante (H4) y borra el
  // `pending` de hoy si no se respondió, para no romper la racha injustamente.
  const handleDeactivate = useCallback(
    (id: string, title: string) => {
      Alert.alert(title, t('non_negotiables.deactivate_confirm'), [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('non_negotiables.deactivate'),
          style: 'destructive',
          onPress: () => setItemActive(id, false),
        },
      ]);
    },
    [t, setItemActive],
  );

  // Doble confirmación: destruye racha y estadísticas, que es lo único
  // irreemplazable de esta función, y no hay copia de seguridad.
  const handleDeleteAll = useCallback(() => {
    Alert.alert(t('non_negotiables.delete_all'), t('non_negotiables.delete_all_hint'), [
      {text: t('common.cancel'), style: 'cancel'},
      {
        text: t('non_negotiables.delete_all_confirm'),
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            t('non_negotiables.delete_all_sure'),
            t('non_negotiables.delete_all_sure_message'),
            [
              {text: t('common.cancel'), style: 'cancel'},
              {
                text: t('non_negotiables.delete_all_confirm'),
                style: 'destructive',
                onPress: deleteAll,
              },
            ],
          ),
      },
    ]);
  }, [t, deleteAll]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.block}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('non_negotiables.enable')}</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{false: theme.colors.border, true: theme.colors.primary}}
              thumbColor={theme.colors.white}
            />
          </View>
        </Card>

        <Card style={styles.block}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={t('non_negotiables.reminder_time')}>
            <Text style={styles.label}>{t('non_negotiables.reminder_time')}</Text>
            <Text style={styles.timeValue}>
              {pad(hour)}:{pad(minute)}
            </Text>
          </TouchableOpacity>
          {showPicker && (
            <View style={styles.picker}>
              <DateTimePicker
                value={timeAsDate}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant={theme.isDark ? 'dark' : 'light'}
                onChange={onTimeChange}
              />
              {Platform.OS === 'ios' && (
                <Button
                  title={t('common.done')}
                  variant="secondary"
                  onPress={() => setShowPicker(false)}
                />
              )}
            </View>
          )}
        </Card>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>{t('non_negotiables.title')}</Text>
          <Text style={styles.counter}>
            {t('non_negotiables.count_of', {
              current: active.length,
              max: MAX_ACTIVE_NON_NEGOTIABLES,
            })}
          </Text>
        </View>

        {active.map(item => {
          const stats = getStats(item.id);
          return (
            <Card key={item.id} style={styles.itemCard}>
              <Text style={styles.itemEmoji}>{item.emoji}</Text>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemStats}>
                  {stats.rate !== null
                    ? `${stats.rate}%`
                    : t('non_negotiables.stats_raw', {done: stats.done, total: stats.total})}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('NonNegotiableEditor', {id: item.id})
                }
                hitSlop={theme.hitSlop}
                accessibilityRole="button"
                accessibilityLabel={t('common.edit')}>
                <Text style={styles.itemAction}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeactivate(item.id, item.title)}
                hitSlop={theme.hitSlop}
                accessibilityRole="button"
                accessibilityLabel={t('non_negotiables.deactivate')}>
                <Text style={styles.itemAction}>🗑</Text>
              </TouchableOpacity>
            </Card>
          );
        })}

        <Button
          title={t('non_negotiables.add')}
          variant="primary"
          onPress={() => navigation.navigate('NonNegotiableEditor', {})}
          disabled={!canAddMore()}
          style={styles.addBtn}
        />
        <Text style={styles.hint}>
          {canAddMore()
            ? t('non_negotiables.recommendation')
            : t('non_negotiables.limit_reached', {max: MAX_ACTIVE_NON_NEGOTIABLES})}
        </Text>

        {items.length > 0 && (
          <View style={styles.dangerCard}>
            <Text style={styles.dangerTitle}>⚠️  {t('week.danger_zone')}</Text>
            <Text style={styles.dangerHint}>{t('non_negotiables.delete_all_hint')}</Text>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={handleDeleteAll}
              accessibilityRole="button"
              accessibilityLabel={t('non_negotiables.delete_all')}>
              <Text style={styles.dangerBtnText}>🗑  {t('non_negotiables.delete_all')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    content: {padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md},
    block: {marginBottom: spacing.xs},
    row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    label: {fontSize: typography.md, color: colors.textPrimary},
    timeValue: {fontSize: typography.lg, fontWeight: typography.bold, color: colors.primary},
    picker: {marginTop: spacing.sm, alignItems: 'center'},

    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
    },
    sectionTitle: {
      fontSize: typography.sm,
      fontWeight: typography.semibold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    counter: {fontSize: typography.sm, color: colors.textTertiary},

    itemCard: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    itemEmoji: {fontSize: typography.xxl},
    itemBody: {flex: 1},
    itemTitle: {fontSize: typography.md, color: colors.textPrimary},
    itemStats: {fontSize: typography.sm, color: colors.textSecondary, marginTop: 2},
    itemAction: {fontSize: typography.lg},

    addBtn: {marginTop: spacing.md},
    hint: {
      fontSize: typography.sm,
      color: colors.textTertiary,
      textAlign: 'center',
      marginTop: spacing.xs,
    },

    dangerCard: {
      marginTop: spacing.xxxl,
      padding: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.error,
    },
    dangerTitle: {
      fontSize: typography.md,
      fontWeight: typography.semibold,
      color: colors.error,
      marginBottom: spacing.xs,
    },
    dangerHint: {fontSize: typography.sm, color: colors.textSecondary, marginBottom: spacing.md},
    dangerBtn: {
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.error,
      alignItems: 'center',
    },
    dangerBtnText: {
      fontSize: typography.md,
      fontWeight: typography.semibold,
      color: colors.white,
    },
  });
