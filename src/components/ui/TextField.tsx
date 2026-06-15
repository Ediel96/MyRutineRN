// src/components/ui/TextField.tsx
// Input con label y estados claros: focus, error y disabled.

import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useTheme} from '../../theme/useTheme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function TextField({label, error, containerStyle, style, editable = true, onFocus, onBlur, ...rest}: TextFieldProps) {
  const {colors, radius, spacing, typography} = useTheme();
  const focusProgress = useSharedValue(0);

  const animatedBorder = useAnimatedStyle(() => {
    const borderColor = error
      ? colors.error
      : focusProgress.value > 0.5
      ? colors.primary
      : colors.border;
    return {
      borderColor,
      borderWidth: 1 + focusProgress.value,
    };
  });

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            fontSize: typography.sm,
            fontWeight: typography.semibold,
            color: colors.textSecondary,
            marginBottom: spacing.sm,
          }}>
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          {borderRadius: radius.lg, backgroundColor: colors.surfaceAlt},
          animatedBorder,
        ]}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              fontSize: typography.md,
              opacity: editable ? 1 : 0.5,
            },
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          editable={editable}
          onFocus={e => {
            focusProgress.value = withTiming(1, {duration: 150});
            onFocus?.(e);
          }}
          onBlur={e => {
            focusProgress.value = withTiming(0, {duration: 150});
            onBlur?.(e);
          }}
          {...rest}
        />
      </Animated.View>
      {error && (
        <Text style={{fontSize: typography.xs, color: colors.error, marginTop: spacing.xs}}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 44,
  },
});
