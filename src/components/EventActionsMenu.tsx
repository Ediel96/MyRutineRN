import React, {useEffect} from 'react';
import {Modal, View, Text, StyleSheet, TouchableOpacity, Pressable} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useTheme, AppTheme} from '../theme/useTheme';

type EventActionsMenuProps = {
  visible: boolean;
  title: string;
  startTime: string;
  endTime: string;
  categoryEmoji: string;
  alarmEnabled: boolean;
  onClose: () => void;
  onAlarm: () => void;
  onPomodoro: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function EventActionsMenu({
  visible,
  title,
  startTime,
  endTime,
  categoryEmoji,
  alarmEnabled,
  onClose,
  onAlarm,
  onPomodoro,
  onEdit,
  onDelete,
}: EventActionsMenuProps) {
  const theme = useTheme();
  const styles = createStyles(theme);

  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 0.9;
      opacity.value = 0;
      scale.value = withSpring(1, {damping: 18, stiffness: 220});
      opacity.value = withTiming(1, {duration: 150});
    }
  }, [visible, scale, opacity]);

  const menuAnim = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
    opacity: opacity.value,
  }));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[styles.menu, menuAnim]}
          onStartShouldSetResponder={() => true}>
          <View style={styles.preview}>
            <Text style={styles.previewTime}>
              {startTime} · {endTime}
            </Text>
            <View style={styles.previewTitleRow}>
              <Text style={styles.previewEmoji}>{categoryEmoji}</Text>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {title}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <MenuItem
            icon={alarmEnabled ? '🔕' : '🔔'}
            label={alarmEnabled ? 'Desactivar alarma' : 'Activar alarma'}
            onPress={onAlarm}
            theme={theme}
          />
          <MenuItem
            icon="⏱"
            label="Iniciar pomodoro"
            onPress={onPomodoro}
            theme={theme}
          />
          <MenuItem
            icon="✏️"
            label="Editar evento"
            onPress={onEdit}
            theme={theme}
          />

          <View style={styles.divider} />

          <MenuItem
            icon="🗑️"
            label="Eliminar"
            onPress={onDelete}
            danger
            theme={theme}
          />
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

type MenuItemProps = {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  theme: AppTheme;
};

function MenuItem({icon, label, onPress, danger = false, theme}: MenuItemProps) {
  const styles = createStyles(theme);
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.item}
      accessibilityLabel={label}
      accessibilityRole="button">
      <Text style={styles.itemIcon}>{icon}</Text>
      <Text style={[styles.itemLabel, danger && styles.itemLabelDanger]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    menu: {
      width: 260,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    preview: {
      padding: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.md,
      marginBottom: spacing.xs,
    },
    previewTime: {
      fontSize: typography.xs,
      color: colors.textTertiary,
      marginBottom: 4,
    },
    previewTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    previewEmoji: {fontSize: 15},
    previewTitle: {
      flex: 1,
      fontSize: typography.md,
      fontWeight: typography.semibold,
      color: colors.textPrimary,
    },
    divider: {
      height: 0.5,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 11,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.sm,
      minHeight: 48,
    },
    itemIcon: {fontSize: 17, width: 22, textAlign: 'center'},
    itemLabel: {
      fontSize: typography.md,
      fontWeight: typography.medium,
      color: colors.textPrimary,
    },
    itemLabelDanger: {color: colors.error},
  });
