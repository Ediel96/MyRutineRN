import React, {useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme, AppTheme} from '../theme/useTheme';
import {useAlarmStore} from '../stores/alarmStore';
import type {Alarm} from '../types/alarm';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AlarmList'>;

export function AlarmListScreen({navigation}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);
  const {alarms, loadAlarms, toggleAlarm, deleteAlarm} = useAlarmStore();

  useEffect(() => {
    loadAlarms();
  }, [loadAlarms]);

  const handleToggle = (id: string, enabled: boolean) => {
    toggleAlarm(id, enabled);
  };

  const handleDelete = (id: string) => {
    deleteAlarm(id);
  };

  const formatTime = (alarm: Alarm) =>
    `${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}`;

  const formatRepeat = (days: number[]) => {
    if (days.length === 0) {
      return 'Solo una vez';
    }
    if (days.length === 7) {
      return 'Todos los días';
    }
    const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days.map(d => names[d]).join(', ');
  };

  const renderItem = ({item}: {item: Alarm}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('AlarmEditor', {alarmId: item.id})}
      accessibilityRole="button"
      accessibilityLabel={`Editar alarma ${item.label}`}>
      <View style={styles.cardLeft}>
        <Text style={[styles.timeText, !item.enabled && styles.dimmed]}>
          {formatTime(item)}
        </Text>
        <Text style={[styles.labelText, !item.enabled && styles.dimmed]}>
          {item.label || 'Alarma'}
        </Text>
        <Text style={styles.repeatText}>{formatRepeat(item.repeatDays)}</Text>
      </View>
      <View style={styles.cardRight}>
        <Switch
          value={item.enabled}
          onValueChange={val => handleToggle(item.id, val)}
          trackColor={{
            false: theme.colors.border,
            true: theme.colors.primary,
          }}
          thumbColor={item.enabled ? '#FFFFFF' : theme.colors.textTertiary}
        />
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          hitSlop={theme.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Eliminar alarma">
          <Text style={styles.deleteIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alarmas</Text>
        {Platform.OS === 'android' && (
          <TouchableOpacity
            onPress={() => navigation.navigate('AndroidPermissionsOnboarding')}
            hitSlop={theme.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Configurar permisos">
            <Text style={styles.permIcon}>⚙️</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={alarms}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⏰</Text>
            <Text style={styles.emptyTitle}>Sin alarmas</Text>
            <Text style={styles.emptySubtitle}>
              Toca el botón + para crear tu primera alarma.
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AlarmEditor', {})}
        accessibilityRole="button"
        accessibilityLabel="Nueva alarma">
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    headerTitle: {
      fontSize: theme.typography.xxxl,
      fontWeight: theme.typography.bold,
      color: theme.colors.textPrimary,
    },
    permIcon: {
      fontSize: 22,
    },
    list: {
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
      paddingBottom: 100,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    cardLeft: {
      flex: 1,
      gap: 2,
    },
    timeText: {
      fontSize: theme.typography.xxxl,
      fontWeight: theme.typography.bold,
      color: theme.colors.textPrimary,
      letterSpacing: 1,
    },
    labelText: {
      fontSize: theme.typography.md,
      fontWeight: theme.typography.medium,
      color: theme.colors.textSecondary,
    },
    repeatText: {
      fontSize: theme.typography.sm,
      color: theme.colors.textTertiary,
    },
    dimmed: {
      opacity: 0.4,
    },
    cardRight: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    deleteIcon: {
      fontSize: 18,
    },
    empty: {
      alignItems: 'center',
      paddingTop: 80,
      gap: theme.spacing.md,
    },
    emptyIcon: {
      fontSize: 64,
    },
    emptyTitle: {
      fontSize: theme.typography.xl,
      fontWeight: theme.typography.semibold,
      color: theme.colors.textPrimary,
    },
    emptySubtitle: {
      fontSize: theme.typography.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.xxl,
    },
    fab: {
      position: 'absolute',
      bottom: 32,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.lg,
    },
    fabIcon: {
      fontSize: 28,
      fontWeight: theme.typography.bold,
      color: '#FFFFFF',
      lineHeight: 32,
    },
  });
}
