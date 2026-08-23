// Dos proyectos separados a propósito.
//
// RN 0.86 sacó el preset de Jest a un paquete aparte, `@react-native/jest-preset`,
// que NO está en las dependencias: por eso `npm test` fallaba con
// "Preset @react-native/jest-preset not found" antes de tocar nada.
//
// La lógica de No Negociables es pura (sin react-native ni MMKV), así que corre
// sin preset. Se separa para que un preset ausente no impida ejecutar los tests
// que sí funcionan.
//
// Para recuperar los tests de componentes:
//   npm install --save-dev @react-native/jest-preset@0.86.0
// y luego descomentar el proyecto 'components'.
module.exports = {
  projects: [
    {
      displayName: 'logic',
      testMatch: ['<rootDir>/__tests__/**/*Logic.test.ts'],
      testEnvironment: 'node',
    },
    // {
    //   displayName: 'components',
    //   preset: '@react-native/jest-preset',
    //   testMatch: ['<rootDir>/__tests__/**/*.test.tsx'],
    // },
  ],
};
