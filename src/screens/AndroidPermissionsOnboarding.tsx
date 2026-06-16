import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useTheme, AppTheme} from '../theme/useTheme';
import {AndroidAlarmModule} from '../native/AndroidAlarmModule';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AndroidPermissionsOnboarding'>;

type PermStatus = 'idle' | 'granted' | 'pending';

interface PermItem {
  key: string;
  emoji: string;
  title: string;
  description: string;
}

const PERMISSIONS: PermItem[] = [
  {
    key: 'exact',
    emoji: '⏰',
    title: 'Alarmas exactas',
    description:
      'Permite que la alarma suene exactamente a la hora configurada, incluso si el teléfono está en modo ahorro de energía.',
  },
  {
    key: 'battery',
    emoji: '🔋',
    title: 'Sin restricción de batería',
    description:
      'Evita que Android suspenda la app antes de que suene la alarma durante la noche.',
  },
];

export function AndroidPermissionsOnboarding({navigation}: Props) {
  const theme = useTheme();
  const styles = createStyles(theme);

  const [status, setStatus] = useState<Record<string, PermStatus>>({
    exact: 'idle',
    battery: 'idle',
  });

  if (Platform.OS !== 'android') {
    navigation.goBack();
    return null;
  }

  const handleGrant = async (key: string) => {
    setStatus(prev => ({...prev, [key]: 'pending'}));
    if (key === 'exact') {
      await AndroidAlarmModule.requestExactAlarmPermission();
    } else if (key === 'battery') {
      await AndroidAlarmModule.requestIgnoreBatteryOptimizations();
    }
    setStatus(prev => ({...prev, [key]: 'granted'}));
  };

  const allGranted = Object.values(status).every(s => s === 'granted');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Configurar permisos</Text>
        <Text style={styles.subtitle}>
          Para que las alarmas funcionen de manera confiable en Android necesitamos estos permisos.
        </Text>

        <View style={styles.list}>
          {PERMISSIONS.map(perm => {
            const s = status[perm.key];
            return (
              <View key={perm.key} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.emoji}>{perm.emoji}</Text>
                  <View style={styles.cardText}>
                    <Text style={styles.permTitle}>{perm.title}</Text>
                    <Text style={styles.permDesc}>{perm.description}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.grantBtn,
                    s === 'granted' && styles.grantedBtn,
                  ]}
                  onPress={() => handleGrant(perm.key)}
                  disabled={s === 'granted' || s === 'pending'}
                  accessibilityRole="button"
                  accessibilityLabel={
                    s === 'granted' ? 'Permiso concedido' : `Conceder: ${perm.title}`
                  }>
                  <Text style={styles.grantBtnText}>
                    {s === 'granted' ? '✓ Concedido' : s === 'pending' ? '...' : 'Conceder'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, !allGranted && styles.continueBtnDisabled]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Continuar">
          <Text style={styles.continueBtnText}>
            {allGranted ? 'Listo' : 'Omitir por ahora'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.xxl,
      fontWeight: theme.typography.bold,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontSize: theme.typography.md,
      color: theme.colors.textSecondary,
      lineHeight: 22,
    },
    list: {
      gap: theme.spacing.md,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      alignItems: 'flex-start',
    },
    emoji: {
      fontSize: 28,
      marginTop: 2,
    },
    cardText: {
      flex: 1,
      gap: 4,
    },
    permTitle: {
      fontSize: theme.typography.md,
      fontWeight: theme.typography.semibold,
      color: theme.colors.textPrimary,
    },
    permDesc: {
      fontSize: theme.typography.sm,
      color: theme.colors.textSecondary,
      lineHeight: 20,
    },
    grantBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    grantedBtn: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    grantBtnText: {
      fontSize: theme.typography.sm,
      fontWeight: theme.typography.semibold,
      color: '#FFFFFF',
    },
    continueBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.xl,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    continueBtnDisabled: {
      backgroundColor: theme.colors.surfaceAlt,
    },
    continueBtnText: {
      fontSize: theme.typography.md,
      fontWeight: theme.typography.bold,
      color: '#FFFFFF',
    },
  });
}
