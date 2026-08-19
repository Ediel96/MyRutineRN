#!/usr/bin/env bash
# scripts/android.sh — utilidades de emulador/dispositivo Android para MyRoutine.
#
# No se invoca directamente: se usa a traves de los scripts de npm.
#   npm run device:space      -> espacio libre en el dispositivo
#   npm run device:cache      -> libera cache (no borra datos)
#   npm run device:uninstall  -> desinstala la app (SI borra datos)
#   npm run device:free       -> cache + desinstalar, para recuperar espacio
#   npm run android:apk       -> compila el APK sin instalarlo
#   npm run android:install   -> instala el APK ya compilado
#   npm run android:clean     -> borra cache de build (en vez de gradlew clean)
#   npm run device:doctor     -> diagnostico general
#
# Ver README.md para la explicacion de cada uno.

set -euo pipefail

APP_ID="com.myroutinern"
APK="android/app/build/outputs/apk/debug/app-debug.apk"

# ---------------------------------------------------------------------------
# adb no suele estar en el PATH. Lo buscamos en las rutas habituales.
# ---------------------------------------------------------------------------
find_adb() {
  if command -v adb >/dev/null 2>&1; then command -v adb; return; fi
  for c in \
    "${ANDROID_HOME:-}/platform-tools/adb" \
    "${ANDROID_SDK_ROOT:-}/platform-tools/adb" \
    "$HOME/Library/Android/sdk/platform-tools/adb" \
    "$HOME/Android/Sdk/platform-tools/adb" \
    "/usr/local/bin/adb"
  do
    [ -x "$c" ] && { echo "$c"; return; }
  done
  return 1
}

# adb se resuelve solo cuando hace falta: `apk` compila con Gradle y no lo
# necesita, asi que no debe fallar en una maquina sin adb en el PATH.
ADB=""
require_adb() {
  [ -n "$ADB" ] && return 0
  ADB="$(find_adb || true)"
  [ -n "$ADB" ] && return 0
  cat >&2 <<'EOF'
No encuentro `adb`.

Suele estar en:
  ~/Library/Android/sdk/platform-tools/adb   (macOS)

Anade esto a tu ~/.zshrc y reinicia la terminal:
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export PATH="$PATH:$ANDROID_HOME/platform-tools"
EOF
  exit 1
}

# Serial del dispositivo elegido. adb respeta ANDROID_SERIAL de forma nativa,
# pero lo pasamos explicito con -s para que el mensaje de error sea claro.
TARGET=""

# Envoltura de adb que siempre apunta al dispositivo seleccionado.
adbx() {
  if [ -n "$TARGET" ]; then "$ADB" -s "$TARGET" "$@"; else "$ADB" "$@"; fi
}

cmd_devices() {
  require_adb
  echo "Dispositivos conectados:"
  "$ADB" devices -l | tail -n +2 | grep -v '^$' | sed 's/^/  /'
}

require_device() {
  require_adb
  local serials
  serials=$("$ADB" devices | awk '$2=="device"{print $1}')
  local n
  n=$(echo "$serials" | grep -c . || true)

  if [ "$n" -eq 0 ]; then
    echo "No hay ningun emulador ni dispositivo conectado." >&2
    echo >&2
    echo "Comprueba:" >&2
    echo "  - Emulador arrancado en Android Studio (Device Manager), o" >&2
    echo "  - Movil conectado por USB, desbloqueado y con depuracion USB aceptada" >&2
    echo >&2
    echo "Si el movil aparecia y ha desaparecido, reinicia el puente adb:" >&2
    echo "  adb kill-server && adb start-server" >&2
    exit 1
  fi

  # Con varios dispositivos hay que elegir: si no, Gradle escoge por su cuenta
  # y acabas instalando en el que no querias.
  if [ "$n" -gt 1 ]; then
    if [ -n "${ANDROID_SERIAL:-}" ]; then
      TARGET="$ANDROID_SERIAL"
      return 0
    fi
    echo "Hay $n dispositivos conectados. Elige uno:" >&2
    echo >&2
    "$ADB" devices -l | tail -n +2 | grep -v '^$' | sed 's/^/  /' >&2
    echo >&2
    echo "Indica cual con ANDROID_SERIAL, por ejemplo:" >&2
    echo "  ANDROID_SERIAL=$(echo "$serials" | head -1) npm run android:install" >&2
    echo >&2
    echo "O desconecta el que no vayas a usar." >&2
    exit 1
  fi

  TARGET="$(echo "$serials" | head -1)"
}

# Espacio libre en /data, en MB (para comparaciones).
free_mb() { adbx shell df /data 2>/dev/null | awk 'NR==2{print int($4/1024)}'; }

cmd_space() {
  require_device
  echo "Espacio en el dispositivo (particion /data):"
  adbx shell df -h /data
  echo
  if [ -f "$APK" ]; then
    local apk_mb; apk_mb=$(( $(wc -c < "$APK") / 1048576 ))
    echo "APK compilado: ${apk_mb} MB"
    echo "Regla practica: necesitas ~3x el peso del APK libre para instalar,"
    echo "porque Android extrae y optimiza el codigo durante la instalacion."
    local libre; libre=$(free_mb)
    echo "Libre ahora: ${libre} MB / recomendado: $(( apk_mb * 3 )) MB"
    if [ "$libre" -lt $(( apk_mb * 3 )) ]; then
      echo
      echo ">> Vas justo. Ejecuta: npm run device:free"
    fi
  fi
}

cmd_cache() {
  require_device
  local antes; antes=$(free_mb)
  echo "Liberando cache de todas las apps (no borra datos de usuario)..."
  adbx shell pm trim-caches 999G || true
  local despues; despues=$(free_mb)
  echo "Libre antes:   ${antes} MB"
  echo "Libre despues: ${despues} MB  (+$(( despues - antes )) MB)"
}

cmd_uninstall() {
  require_device
  echo "Desinstalando ${APP_ID}..."
  echo "AVISO: se borran las rutinas guardadas. La app no tiene backend,"
  echo "       todo se guarda localmente en MMKV, asi que no hay copia."
  adbx uninstall "$APP_ID" || echo "  (no estaba instalada)"
}

cmd_free() {
  require_device
  local antes; antes=$(free_mb)
  cmd_cache
  echo
  cmd_uninstall
  local despues; despues=$(free_mb)
  echo
  echo "Total recuperado: $(( despues - antes )) MB (libre ahora: ${despues} MB)"
}

# Limpieza a nivel de sistema de archivos, SIN pasar por `./gradlew clean`.
#
# Por que no se usa `./gradlew clean`: con la nueva arquitectura de RN, la tarea
# externalNativeBuildCleanDebug obliga a CMake a reconfigurarse para saber que
# tiene que limpiar. Esa reconfiguracion lee las carpetas de codegen de cada
# libreria (node_modules/<pkg>/android/build/generated/source/codegen/jni), que
# solo existen despues de una COMPILACION. Si acabas de reinstalar node_modules,
# esas carpetas no existen todavia y el clean falla con "add_subdirectory given
# source ... which is not an existing directory". Huevo y gallina.
#
# Borrando las carpetas a mano se evita el problema: el siguiente build
# regenera el codegen y reconfigura CMake desde cero.
cmd_clean() {
  echo "Borrando cache de compilacion nativa y de Gradle..."
  local before
  before=$(du -sm android/app/.cxx android/app/build android/build 2>/dev/null | awk '{s+=$1} END{print s+0}')

  rm -rf android/app/.cxx android/app/build android/build
  rm -rf android/.gradle

  # Codegen obsoleto dentro de node_modules (lo regenera el siguiente build).
  rm -rf node_modules/*/android/build node_modules/@*/*/android/build 2>/dev/null || true

  echo "Liberados ~${before} MB."
  echo
  echo "Ahora compila normalmente (NO uses ./gradlew clean):"
  echo "  npm run android:fast"
}

cmd_apk() {
  echo "Compilando APK de debug solo para la arquitectura del dispositivo..."
  ( cd android && ./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a )
  ls -lh "$APK"
}

cmd_install() {
  require_device
  [ -f "$APK" ] || { echo "No hay APK compilado. Ejecuta antes: npm run android:apk" >&2; exit 1; }
  echo "Instalando ${APK}..."
  # -r reinstala conservando datos; -d permite bajar de version.
  if ! adbx install -r -d "$APK"; then
    echo >&2
    echo "Fallo la instalacion. Segun el mensaje de arriba:" >&2
    echo "  INSUFFICIENT_STORAGE  -> npm run device:free" >&2
    echo "  device ... not found  -> el cable/dispositivo se desconecto a mitad." >&2
    echo "                           Desbloquea el movil, revisa el cable y:" >&2
    echo "                             adb kill-server && adb start-server" >&2
    echo "                           Luego repite: npm run android:install" >&2
    echo "                           (el APK ya esta compilado, no hay que rehacerlo)" >&2
    echo "  INSTALL_FAILED_UPDATE_INCOMPATIBLE -> firma distinta:" >&2
    echo "                           npm run device:uninstall && npm run android:install" >&2
    exit 1
  fi
  echo "Instalado. Abriendo la app..."
  adbx shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
}

# Desglosa el peso de un APK: cuanto pesa cada arquitectura nativa, el bundle
# de JS y el codigo Java/Kotlin. Sirve para saber donde atacar.
cmd_size() {
  local f="${2:-}"
  [ -z "$f" ] && for c in \
      "android/app/build/outputs/apk/release/app-release.apk" \
      "$APK"; do
    [ -f "$c" ] && { f="$c"; break; }
  done
  [ -n "$f" ] && [ -f "$f" ] || {
    echo "No encuentro ningun APK. Compila antes:" >&2
    echo "  npm run android:apk       (debug)" >&2
    echo "  npm run android:release   (release)" >&2
    exit 1
  }

  echo "APK: $f"
  echo "Tamano del archivo (comprimido, lo que ocupa en disco): $(( $(wc -c < "$f") / 1048576 )) MB"
  echo
  echo "Desglose SIN COMPRIMIR — sirve para comparar pesos relativos entre"
  echo "secciones, no para sumar: el total de abajo supera al de arriba."
  echo
  echo "Librerias nativas por arquitectura:"
  unzip -l "$f" | awk '/ lib\//{split($4,a,"/"); s[a[2]]+=$1} END{
    for(k in s) printf "  %-14s %7.1f MB\n", k, s[k]/1048576}' | sort -k2 -rn
  echo
  echo "Resto:"
  unzip -l "$f" | awk '
    / assets\/.*\.bundle/{js+=$1}
    /classes.*\.dex/{dex+=$1}
    / res\//{res+=$1}
    END{
      printf "  %-14s %7.1f MB  (bundle de JavaScript)\n", "assets", js/1048576
      printf "  %-14s %7.1f MB  (codigo Java/Kotlin -> lo que reduce R8)\n", "dex", dex/1048576
      printf "  %-14s %7.1f MB  (recursos Android)\n",     "res",    res/1048576
    }'
}

cmd_doctor() {
  require_adb
  echo "adb: $ADB"
  echo
  echo "Dispositivos conectados:"
  "$ADB" devices -l
  echo
  require_device
  echo "Arquitectura del dispositivo: $(adbx shell getprop ro.product.cpu.abi | tr -d '\r')"
  echo "Version de Android:           $(adbx shell getprop ro.build.version.release | tr -d '\r')"
  echo "App instalada:                $(adbx shell pm list packages "$APP_ID" | tr -d '\r' | grep -q . && echo si || echo no)"
  echo
  cmd_space
}

case "${1:-}" in
  space)     cmd_space ;;
  cache)     cmd_cache ;;
  uninstall) cmd_uninstall ;;
  free)      cmd_free ;;
  apk)       cmd_apk ;;
  install)   cmd_install ;;
  size)      cmd_size "$@" ;;
  clean)     cmd_clean ;;
  devices)   cmd_devices ;;
  doctor)    cmd_doctor ;;
  *)
    echo "Uso: scripts/android.sh {devices|space|cache|uninstall|free|apk|install|size|clean|doctor}" >&2
    echo "Normalmente se usa via npm; ver README.md" >&2
    exit 1 ;;
esac
