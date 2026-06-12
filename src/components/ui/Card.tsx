// src/components/ui/Card.tsx
// Tarjeta con bordes redondeados y superficie elevada sobre el fondo del tema.

import React from 'react';
import {StyleProp, View, ViewStyle} from 'react-native';
import {useTheme} from '../../theme/useTheme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  variant?: 'surface' | 'surfaceAlt';
  borderLeftColor?: string;
}

export default function Card({children, style, elevated = false, variant = 'surface', borderLeftColor}: CardProps) {
  const {colors, radius, spacing, shadows} = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: variant === 'surface' ? colors.surface : colors.surfaceAlt,
          borderRadius: radius.xl,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        elevated && shadows.md,
        borderLeftColor && {borderLeftWidth: 4, borderLeftColor},
        style,
      ]}>
      {children}
    </View>
  );
}
