// src/components/ui/Button.tsx
// Botón primario (gradiente), secundario (outline) y terciario (texto).

import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import HapticFeedback from 'react-native-haptic-feedback';
import {useTheme} from '../../theme/useTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  fullWidth = true,
}: ButtonProps) {
  const {colors, gradients, radius, spacing, typography, minTapSize} = useTheme();
  const isDisabled = disabled || loading;

  const handlePress = () => {
    HapticFeedback.trigger('impactLight', {enableVibrateFallback: true, ignoreAndroidSystemSettings: false});
    onPress();
  };

  const base: ViewStyle = {
    borderRadius: radius.full,
    minHeight: minTapSize,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : undefined,
    opacity: isDisabled ? 0.5 : 1,
  };

  const label = (color: string) => (
    <>
      {icon && <Text style={[styles.icon, {color}]}>{icon} </Text>}
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.text, {color, fontWeight: typography.semibold, fontSize: typography.lg}]}>
          {title}
        </Text>
      )}
    </>
  );

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={handlePress} disabled={isDisabled} activeOpacity={0.85} style={style}>
        <LinearGradient
          colors={[...gradients.primary]}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={base}>
          {label(colors.white)}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[base, {backgroundColor: colors.error + '20'}, style]}>
        {label(colors.error)}
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[base, {borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent'}, style]}>
        {label(colors.primary)}
      </TouchableOpacity>
    );
  }

  // tertiary
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        base,
        {backgroundColor: 'transparent', paddingVertical: spacing.sm, width: fullWidth ? '100%' : undefined},
        style,
      ]}>
      {label(colors.primary)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
  },
  icon: {
    fontSize: 16,
  },
});
