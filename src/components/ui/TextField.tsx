// src/components/ui/TextField.tsx
// Input con label y estados claros: focus, error y disabled.

import React, {useState} from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {useTheme} from '../../theme/useTheme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function TextField({label, error, containerStyle, style, editable = true, onFocus, onBlur, ...rest}: TextFieldProps) {
  const {colors, radius, spacing, typography} = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.error : focused ? colors.primary : colors.border;

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
      <TextInput
        style={[
          styles.input,
          {
            borderRadius: radius.lg,
            borderColor,
            borderWidth: focused || error ? 2 : 1,
            backgroundColor: colors.surfaceAlt,
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
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
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
