// src/components/ui/Badge.tsx
// Etiqueta pequeña para categorías, estados y destacados.

import React from 'react';
import {StyleProp, Text, View, ViewStyle} from 'react-native';
import {useTheme} from '../../theme/useTheme';

interface BadgeProps {
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Badge({label, color, style}: BadgeProps) {
  const {colors, radius, spacing, typography} = useTheme();
  const tint = color || colors.primary;

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xxs + 2,
          borderRadius: radius.full,
          backgroundColor: tint + '26',
        },
        style,
      ]}>
      <Text style={{color: tint, fontSize: typography.xs, fontWeight: typography.semibold}}>
        {label}
      </Text>
    </View>
  );
}
