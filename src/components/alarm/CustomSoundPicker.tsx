import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import {useTheme, AppTheme} from '../../theme/useTheme';
import type {AlarmSoundSource} from '../../types/alarm';

interface CustomSoundPickerProps {
  current: AlarmSoundSource | null;
  onChange: (sound: AlarmSoundSource) => void;
}

export function CustomSoundPicker({current, onChange}: CustomSoundPickerProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  if (Platform.OS !== 'android') {
    return null;
  }

  const handlePick = async () => {
    try {
      const results = await pick({
        type: [types.audio],
        allowMultiSelection: false,
        mode: 'import',
      });
      const result = results[0];
      if (!result) {
        return;
      }
      onChange({
        type: 'custom',
        uri: result.uri,
        fileName: result.name ?? 'custom_sound',
      });
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      console.warn('CustomSoundPicker error:', err);
    }
  };

  const isCustom = current?.type === 'custom';
  const displayName = isCustom
    ? current.fileName
    : current?.type === 'system'
    ? current.label
    : 'Sonido del sistema';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.label}>Sonido</Text>
          <Text style={styles.currentName} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.btn}
          onPress={handlePick}
          accessibilityRole="button"
          accessibilityLabel="Seleccionar archivo de audio">
          <Text style={styles.btnText}>Elegir archivo</Text>
        </TouchableOpacity>
      </View>

      {isCustom && (
        <View style={styles.customBadge}>
          <Text style={styles.customBadgeText}>🎵 Archivo personalizado</Text>
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    label: {
      fontSize: theme.typography.xs,
      fontWeight: theme.typography.semibold,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    currentName: {
      fontSize: theme.typography.md,
      fontWeight: theme.typography.medium,
      color: theme.colors.textPrimary,
    },
    btn: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    btnText: {
      fontSize: theme.typography.sm,
      fontWeight: theme.typography.semibold,
      color: '#FFFFFF',
    },
    customBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    customBadgeText: {
      fontSize: theme.typography.xs,
      color: theme.colors.textSecondary,
    },
  });
}
