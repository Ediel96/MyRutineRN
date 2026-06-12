// src/components/ui/GradientView.tsx
// Wrapper de LinearGradient con los gradientes del sistema de diseño.

import React from 'react';
import {StyleProp, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTheme} from '../../theme/useTheme';

interface GradientViewProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'warm' | 'ai';
  style?: StyleProp<ViewStyle>;
}

export default function GradientView({children, variant = 'primary', style}: GradientViewProps) {
  const {gradients} = useTheme();

  return (
    <LinearGradient colors={[...gradients[variant]]} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={style}>
      {children}
    </LinearGradient>
  );
}
