// src/components/ui/DayChips.tsx
// Fila de chips de días de la semana, compartida entre pantallas.
//
// Extraído de EventEditorScreen, donde estaba inline con estilos locales.
// Ahora lo usan:
//   - EventEditorScreen -> interactivo (size="md"), para elegir los días
//   - WeekScreen         -> solo lectura (size="sm"), para mostrar en qué días
//                           aplica una rutina
//
// Las etiquetas salen de i18n (`weekdays.mon`...). Antes el editor hacía
// `d.slice(0, 3)` sobre el valor crudo del enum, así que mostraba "mon"/"tue"
// en vez de "Lun"/"Mar" en cualquier idioma.

import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme, AppTheme} from '../../theme/useTheme';
import {WeekDay} from '../../types/enums';

// Orden de lunes a domingo (el enum empieza en domingo).
export const WEEK_ORDER: WeekDay[] = [
  WeekDay.monday,
  WeekDay.tuesday,
  WeekDay.wednesday,
  WeekDay.thursday,
  WeekDay.friday,
  WeekDay.saturday,
  WeekDay.sunday,
];

// Clave i18n corta de cada día (`weekdays.mon` -> "Lun").
const SHORT_KEY: Record<WeekDay, string> = {
  [WeekDay.monday]: 'mon',
  [WeekDay.tuesday]: 'tue',
  [WeekDay.wednesday]: 'wed',
  [WeekDay.thursday]: 'thu',
  [WeekDay.friday]: 'fri',
  [WeekDay.saturday]: 'sat',
  [WeekDay.sunday]: 'sun',
};

export interface DayChipsProps {
  /** Días activos/resaltados. */
  days: WeekDay[];
  /** Si se pasa, los chips son pulsables. Si no, la fila es solo lectura. */
  onToggle?: (day: WeekDay) => void;
  /**
   * "md": etiqueta corta completa ("Lun"). Para formularios.
   * "sm": solo la inicial ("L"). Para filas compactas de lista.
   */
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export default function DayChips({days, onToggle, size = 'md', style}: DayChipsProps) {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  const isSmall = size === 'sm';
  const activeSet = React.useMemo(() => new Set(days), [days]);

  return (
    <View style={[styles.group, isSmall && styles.groupSmall, style]}>
      {WEEK_ORDER.map(day => {
        const active = activeSet.has(day);
        const short = t(`weekdays.${SHORT_KEY[day]}`);
        const label = isSmall ? short.charAt(0).toUpperCase() : short;

        const content = (
          <View
            style={[
              isSmall ? styles.chipSmall : styles.chip,
              active && styles.chipActive,
            ]}>
            <Text
              style={[
                isSmall ? styles.chipTextSmall : styles.chipText,
                active && styles.chipTextActive,
              ]}>
              {label}
            </Text>
          </View>
        );

        // Solo lectura: un View sin área táctil, pero con etiqueta accesible
        // para que el lector de pantalla anuncie el día completo y su estado.
        if (!onToggle) {
          return (
            <View
              key={day}
              accessible
              accessibilityLabel={t(`weekdays.${day}`)}
              accessibilityState={{selected: active}}>
              {content}
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={day}
            onPress={() => onToggle(day)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityLabel={t(`weekdays.${day}`)}
            accessibilityState={{checked: active}}>
            {content}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    group: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs},
    groupSmall: {flexWrap: 'nowrap', gap: spacing.xxs},

    // Tamaño formulario: mismas medidas que tenía EventEditorScreen.
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipText: {fontSize: typography.xs + 1, color: colors.textPrimary},

    // Tamaño compacto: círculo de una letra para filas de lista.
    chipSmall: {
      width: 24,
      height: 24,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipTextSmall: {
      fontSize: typography.xs,
      fontWeight: typography.semibold,
      color: colors.textTertiary,
    },

    chipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
    chipTextActive: {color: colors.white, fontWeight: typography.semibold},
  });
