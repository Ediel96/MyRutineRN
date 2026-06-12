// src/components/ui/ScreenContainer.tsx
// Contenedor base de pantalla: SafeAreaView con el fondo del tema activo.

import React from 'react';
import {SafeAreaView, StyleProp, ViewStyle} from 'react-native';
import {useTheme} from '../../theme/useTheme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function ScreenContainer({children, style}: ScreenContainerProps) {
  const {colors} = useTheme();

  return (
    <SafeAreaView style={[{flex: 1, backgroundColor: colors.background}, style]}>
      {children}
    </SafeAreaView>
  );
}
