#!/usr/bin/env bash
# scripts/ios.sh — utilidades de simulador iOS para MyRoutine.
#
# Equivalente a scripts/android.sh. Se usa vía npm:
#   npm run ios:devices   -> simuladores disponibles y cuál está arrancado
#   npm run ios:fast      -> compila e instala en un simulador FIJO
#   npm run ios:install   -> instala el .app ya compilado (sin recompilar)
#   npm run ios:pods      -> pod install solo si el Podfile cambió
#   npm run ios:doctor    -> diagnóstico
#
# Para elegir simulador:  IOS_SIM="iPhone 16 Pro" npm run ios:fast
#
# Ver README.md.

set -euo pipefail

SCHEME="MyRoutineRN"
APP_NAME="MyRoutineRN.app"
BUNDLE_ID="org.reactjs.native.example.MyRoutineRN"

require_macos() {
  if ! command -v xcrun >/dev/null 2>&1; then
    echo "Este script necesita Xcode: xcrun no está disponible." >&2
    echo "Solo funciona en macOS con las Command Line Tools instaladas." >&2
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Simuladores
# ---------------------------------------------------------------------------


booted_sim() {
  xcrun simctl list devices booted 2>/dev/null \
    | grep -oE '^\s+.+\(Booted\)' \
    | sed -E 's/^[[:space:]]*(.+) \([0-9A-F-]+\) \(Booted\)/\1/' \
    | head -1
}

# Simulador objetivo: el explícito, el arrancado, o el primer iPhone disponible.
target_sim() {
  if [ -n "${IOS_SIM:-}" ]; then echo "$IOS_SIM"; return; fi
  local booted; booted="$(booted_sim || true)"
  if [ -n "$booted" ]; then echo "$booted"; return; fi
  xcrun simctl list devices available 2>/dev/null \
    | grep -oE '^\s+iPhone [^(]+' \
    | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' \
    | tail -1
}

cmd_devices() {
  require_macos
  echo "Simuladores disponibles:"
  xcrun simctl list devices available | grep -E "^\s+(iPhone|iPad)" | sed 's/^/  /'
  echo
  local b; b="$(booted_sim || true)"
  if [ -n "$b" ]; then
    echo "Arrancado ahora: $b"
  else
    echo "Ninguno arrancado. Se arrancará solo al ejecutar ios:fast."
  fi
  echo
  echo "Objetivo que usaría ios:fast: $(target_sim)"
}

# ---------------------------------------------------------------------------
# Pods
#
# `pod install` tarda ~1 min y solo hace falta cuando cambian las dependencias
# nativas. Los scripts ios:reset / ios:clean-install lo ejecutan siempre, que
# es justo lo que hace lento el ciclo. Aquí se compara un hash del Podfile con
# el de la última instalación.
# ---------------------------------------------------------------------------

pods_stamp() { echo "ios/.pods-stamp"; }

pods_hash() {
  cat ios/Podfile ios/Podfile.lock package.json 2>/dev/null | shasum | cut -d' ' -f1
}

cmd_pods() {
  require_macos
  local current stored
  current="$(pods_hash)"
  stored="$(cat "$(pods_stamp)" 2>/dev/null || echo '')"

  if [ "$current" = "$stored" ] && [ -d ios/Pods ]; then
    echo "Pods al día, no hace falta reinstalar."
    echo "Para forzar: rm ios/.pods-stamp && npm run ios:pods"
    return 0
  fi

  echo "El Podfile o las dependencias cambiaron. Ejecutando pod install..."
  ( cd ios && npx pod-install )
  echo "$current" > "$(pods_stamp)"
  echo "Listo."
}

# ---------------------------------------------------------------------------
# Compilar y ejecutar
# ---------------------------------------------------------------------------

cmd_fast() {
  require_macos
  local sim; sim="$(target_sim)"
  if [ -z "$sim" ]; then
    echo "No encuentro ningún simulador de iPhone disponible." >&2
    echo "Ábrelo desde Xcode > Window > Devices and Simulators." >&2
    exit 1
  fi

  cmd_pods

  echo
  echo "Compilando para: $sim"
  echo "Fijar el simulador importa: si react-native run-ios elige uno distinto"
  echo "cada vez, Xcode recompila para ese destino desde cero."
  echo
  npx react-native run-ios --simulator="$sim"
}

# Ruta del .app ya compilado dentro de DerivedData.
find_app() {
  local dd="$HOME/Library/Developer/Xcode/DerivedData"
  find "$dd" -maxdepth 5 -type d -name "$APP_NAME" -path "*Debug-iphonesimulator*" 2>/dev/null \
    | head -1
}

# Instala el .app existente sin recompilar. El equivalente de android:install.
cmd_install() {
  require_macos
  local app; app="$(find_app)"
  if [ -z "$app" ]; then
    echo "No encuentro un .app compilado en DerivedData." >&2
    echo "Compila primero: npm run ios:fast" >&2
    exit 1
  fi

  local sim; sim="$(booted_sim || true)"
  if [ -z "$sim" ]; then
    sim="$(target_sim)"
    echo "Arrancando simulador: $sim"
    xcrun simctl boot "$sim" 2>/dev/null || true
    open -a Simulator 2>/dev/null || true
    sleep 3
  fi

  echo "Instalando $app"
  xcrun simctl install booted "$app"
  echo "Abriendo la app..."
  xcrun simctl launch booted "$BUNDLE_ID"
}

cmd_doctor() {
  require_macos
  echo "Xcode:      $(xcodebuild -version 2>/dev/null | head -1)"
  echo "Scheme:     $SCHEME"
  echo "Bundle ID:  $BUNDLE_ID"
  echo
  if [ -d ios/Pods ]; then
    echo "Pods:       instalados ($(du -sh ios/Pods 2>/dev/null | cut -f1))"
  else
    echo "Pods:       NO instalados -> npm run ios:pods"
  fi
  local app; app="$(find_app)"
  if [ -n "$app" ]; then
    echo "Build:      $app"
  else
    echo "Build:      sin compilar todavía"
  fi
  echo
  cmd_devices
}

case "${1:-}" in
  devices)  cmd_devices ;;
  fast)     cmd_fast ;;
  install)  cmd_install ;;
  pods)     cmd_pods ;;
  doctor)   cmd_doctor ;;
  *)
    echo "Uso: scripts/ios.sh {devices|fast|install|pods|doctor}" >&2
    echo "Normalmente se usa vía npm; ver README.md" >&2
    exit 1 ;;
esac
