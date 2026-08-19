# MyRoutine

App de rutinas diarias con alarmas nativas, temporizador Pomodoro y creación de
rutinas por IA (texto o voz). React Native 0.86 con la nueva arquitectura.
Port del original en SwiftUI/SwiftData para iOS.

Toda la persistencia es **local** (MMKV). No hay backend, no hay cuentas, no hay
sincronización. Si borras la app, se van los datos.

---

## Requisitos

| | |
|---|---|
| Node | >= 22.11.0 |
| JDK | 17 |
| Android SDK | API 36 |
| Xcode | para iOS (AlarmKit requiere iOS 26+) |

`adb` tiene que estar accesible. Si no lo está, añade esto a tu `~/.zshrc`:

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
```

Para comprobar que todo está en su sitio:

```sh
npm run device:doctor
```

---

## Arranque rápido

```sh
npm install          # instala dependencias y aplica los parches
npm start            # arranca Metro (dejar corriendo en su propia terminal)
npm run android:fast # compila e instala en el emulador/dispositivo
```

---

## Comandos

### Desarrollo diario

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca Metro, el servidor que sirve el JavaScript a la app. Déjalo corriendo. |
| `npm run android:fast` | **El que vas a usar el 95% del tiempo.** Compila e instala en Android solo para la arquitectura del dispositivo conectado. |
| `npm run android` | Igual, pero compila las 4 arquitecturas. Más lento y APK mucho más pesado. Úsalo solo para verificar antes de publicar. |
| `npm run ios` | Compila y ejecuta en el simulador de iOS. |
| `npm run lint` | ESLint sobre todo el proyecto. |
| `npm test` | Tests con Jest. |

Un test suelto:

```sh
npx jest ruta/al/archivo.test.tsx -t "nombre del test"
```

### Por qué existe `android:fast`

`npm run android` compila las librerías nativas para las **cuatro**
arquitecturas de Android:

| ABI | Peso en el APK |
|---|---|
| x86 | 53.0 MB |
| arm64-v8a | 52.9 MB |
| x86_64 | 51.7 MB |
| armeabi-v7a | 31.3 MB |

Eso son 202 MB de APK, de los que tu emulador usa **una sola** (`arm64-v8a` en
Mac con Apple Silicon). Las otras tres se compilan, se empaquetan y se copian al
emulador para nada — y son la causa típica del error
`INSTALL_FAILED_INSUFFICIENT_STORAGE`.

`android:fast` usa `--active-arch-only`: detecta la arquitectura del dispositivo
conectado y compila solo esa. El APK baja a ~65 MB y el build es notablemente
más rápido.

---

## Emulador: espacio, caché e instalación

Estos comandos envuelven `adb` para que no tengas que recordar la sintaxis.
Todos viven en `scripts/android.sh`.

| Comando | Qué hace | ¿Borra datos? |
|---|---|---|
| `npm run device:doctor` | Diagnóstico: adb, dispositivos, arquitectura, versión de Android, espacio. | No |
| `npm run device:space` | Espacio libre y si te alcanza para instalar el APK actual. | No |
| `npm run device:cache` | Libera la caché de todas las apps del dispositivo. | No |
| `npm run device:uninstall` | Desinstala MyRoutine del dispositivo. | **Sí** |
| `npm run device:free` | Caché + desinstalar. Para recuperar el máximo espacio. | **Sí** |
| `npm run android:apk` | Compila el APK **sin** instalarlo. | No |
| `npm run android:install` | Instala el APK ya compilado (sin recompilar). | No |
| `npm run android:size` | Desglosa el peso del APK por sección. | No |

### Cuando falla la instalación por falta de espacio

Si ves esto:

```
INSTALL_FAILED_INSUFFICIENT_STORAGE: Failed to override installation location
```

Tu código está bien — compiló correctamente. Lo que falló es el último paso,
copiar el APK al emulador. En orden, de menos a más agresivo:

```sh
npm run device:space   # 1. ver cuánto falta
npm run device:cache   # 2. liberar caché (inofensivo, prueba esto primero)
npm run device:free    # 3. si aún no alcanza (borra tus rutinas guardadas)
```

Si ni con eso alcanza, el disco del AVD es demasiado pequeño. En Android Studio:
**Device Manager → el emulador → Edit → Show Advanced Settings → Internal
Storage**. Súbelo a 8192 MB. O usa **Wipe Data** para dejarlo en limpio.

Android necesita alrededor de **3 veces** el peso del APK en espacio libre,
porque durante la instalación extrae y optimiza el código antes de liberar lo
temporal. Con un APK de 202 MB eso son ~600 MB; con uno de 65 MB, ~200 MB. Otra
razón para usar `android:fast`.

### Compilar e instalar por separado

Útil cuando la instalación falla y no quieres esperar otro build completo:

```sh
npm run android:apk      # compila (tarda)
npm run device:free      # haces sitio
npm run android:install  # instala el APK que ya tenías (segundos)
```

---

## Builds de producción

| Comando | Salida |
|---|---|
| `npm run android:release` | APK de release en `android/app/build/outputs/apk/release/` |
| `npm run android:bundle` | AAB para Play Store en `android/app/build/outputs/bundle/release/` |

**Para publicar usa el AAB**, no el APK. Play Store recibe el bundle y entrega
a cada usuario solo la arquitectura y los recursos de su dispositivo, así que
la descarga real es alrededor de un tercio del APK universal. No hay que
configurar nada.

Si necesitas APKs sueltos por arquitectura (instalación manual, distribución
fuera de Play):

```sh
cd android && ./gradlew assembleRelease -PsplitApks
```

### ⚠️ El release está firmado con la clave de debug

En `app/build.gradle`, el bloque `release` usa `signingConfigs.debug`. Es lo que
trae la plantilla de React Native. **Play Store va a rechazar ese APK**, y una
vez publiques con una clave no puedes cambiarla nunca más.

Antes de la primera publicación tienes que generar tu propio keystore, guardarlo
donde no se pierda y **no** subirlo a git. No lo he tocado porque es una
decisión tuya y las credenciales no deben salir de tu máquina.

### Qué se optimizó y cuánto pesa cada cosa

Mide el APK en cualquier momento:

```sh
npm run android:size
```

Las optimizaciones aplicadas, de mayor a menor impacto:

**1. Una sola arquitectura en desarrollo** — `--active-arch-only`
Ya medido: el APK de debug pasó de **202 MB a 64 MB**. Es el cambio más grande
y el que más acelera el build, porque compilar las librerías nativas cuatro
veces es la mayor parte del tiempo.

**2. R8 activado en release** — `enableProguardInReleaseBuilds = true`
Estaba desactivado. R8 recorre el grafo de llamadas y descarta todo el código
Java/Kotlin inalcanzable de las librerías. El `classes.dex` son 24 MB sin
comprimir en el build actual; R8 se lleva una parte grande de eso.

**3. `shrinkResources`** — elimina drawables, layouts y strings que ya no
referencia nadie tras el paso de R8.

**4. Solo 3 idiomas** — `resourceConfigurations += ["en","es","fr"]`
AndroidX y Material empaquetan sus textos en unos 80 idiomas. La app solo tiene
`src/i18n/locales/{en,es,fr}.json`; el resto era peso muerto.

**5. Se eliminó x86 (32 bits)** — en `reactNativeArchitectures`
No queda ningún dispositivo ni emulador moderno que lo use, y aportaba 53 MB al
APK universal. Se mantienen `armeabi-v7a`, `arm64-v8a` y `x86_64`.

Y para la velocidad del build:

**6. Gradle en paralelo, con caché y más memoria**
El heap pasó de 2 GB a 4 GB (con 2 GB el recolector de basura no para en un
proyecto con ~15 módulos nativos), se activó `org.gradle.parallel` para
compilar módulos independientes a la vez, y `org.gradle.caching` para reutilizar
resultados de tareas entre builds — incluso después de un `clean`. El primer
build tras el cambio no mejora; los siguientes sí, bastante.

Si tu Mac tiene 32 GB de RAM, sube `org.gradle.jvmargs` a `-Xmx6144m`. Si ves
`Java heap space` o el build se cuelga, bájalo.

### Si un build de release falla tras activar R8

Es el riesgo conocido de minificar: R8 no ve el código que se llama por
reflexión o desde JNI, y puede eliminarlo. El síntoma es un crash en release
que no ocurre en debug — `ClassNotFoundException`, `NoSuchMethodError`, o un
módulo nativo que "no existe".

**El arreglo es añadir una regla `-keep` en `android/app/proguard-rules.pro`,
no volver a poner `enableProguardInReleaseBuilds = false`.** Ese archivo ya
tiene reglas para React Native, Hermes, los módulos nativos de alarma y las
librerías de terceros del proyecto, con comentarios explicando cada bloque.

Para ver qué eliminó R8, después de un build de release:

```
android/app/build/outputs/mapping/release/usage.txt    # lo que se eliminó
android/app/build/outputs/mapping/release/mapping.txt  # lo que se renombró
```

Guarda el `mapping.txt` de cada versión que publiques: sin él, los stack traces
de producción son ilegibles.

---

## Cuando algo va mal

Los comandos de limpieza, ordenados de más rápido a más lento. **Ve en orden**,
no saltes directo al último: `clean:node` tarda varios minutos.

| Comando | Qué borra | Cuándo |
|---|---|---|
| `npm run start:reset` | Caché de Metro | La app no refleja tus cambios de JS, o errores raros de imports |
| `npm run android:reset` | Build de Gradle + caché de Metro | Errores de compilación de Android que no entiendes |
| `npm run ios:reset` | Pods + build de Xcode + caché de Metro | Lo mismo en iOS |
| `npm run clean:node` | `node_modules` entero, reinstala | Tras cambiar dependencias, o si nada de lo anterior funciona |
| `npm run android:clean-install` | Todo lo anterior + compila Android | Último recurso |
| `npm run ios:clean-install` | Todo lo anterior + compila iOS | Último recurso |

### Errores frecuentes

**`patch-package` falla al aplicar un parche**

```sh
npm run clean:node
```

Si sigue fallando, el archivo de `patches/` está corrupto. Ojo con esto: al
regenerar un parche **nunca lo hagas después de haber compilado Android**, o
`patch-package` se traga todo `node_modules/<pkg>/android/build/` (cientos de
artefactos binarios) y genera un parche inservible. Si tienes que regenerarlo:

```sh
npx patch-package <paquete> --exclude 'android/build'
```

**`No modules to process in combine-js-to-schema-cli`**

Es ruido de codegen, no un error. Ignóralo.

**Las alarmas no suenan en Android**

Revisa los permisos: alarmas exactas, ignorar optimización de batería, y mostrar
sobre otras apps. La pantalla `AndroidPermissionsOnboarding` los pide, pero en
un emulador recién creado suele haber que darlos a mano en Ajustes.

---

## Estructura

```
src/
├── screens/      Pantallas (Today, Week, Calendar, Stats, Settings, Pomodoro...)
├── components/   UI reutilizable (ui/, pomodoro/, settings/, alarm/)
├── stores/       Estado con Zustand sobre MMKV
├── services/     Persistencia, notificaciones, parser de IA, keychain, logger
├── native/       Puentes a los módulos nativos de alarma
├── navigation/   Stack + tabs
├── theme/        Sistema de diseño (colores, espaciado, tipografía)
├── i18n/         es / en / fr
└── types/        Modelos y enums

brand/            Iconos: SVG fuente, generador y assets web
scripts/          Utilidades de desarrollo
```

### Dónde está cada cosa

- **Tema y colores** → `src/theme/AppTheme.ts`. Nunca escribas un color a mano en
  un componente; sácalo de `useTheme()`.
- **Dos sistemas de alarma distintos**: las de rutina son campos dentro de
  `RoutineEvent` (vía `services/notifications.ts`); las independientes son el
  modelo `Alarm` en `alarmStore` (vía `services/AlarmService.ts`). No los
  confundas.
- **Parser de IA** → `src/services/aiParser.ts`. Las claves de API van a
  `react-native-keychain`, nunca a MMKV.
- **Iconos** → `brand/README.md` explica el diseño y cómo regenerarlos.

Hay más detalle de arquitectura en `CLAUDE.md`.

---

## Notas

- Muchos archivos llevan comentarios `// equivalente a X.swift` que apuntan al
  archivo del proyecto iOS original. Si un port parece incompleto, ese archivo
  es la referencia de comportamiento esperado.
- El postinstall de `hyochan-welcome` que npm bloquea es inofensivo: solo imprime
  un ASCII art. Es una dependencia de `react-native-audio-recorder-player`.
- Los avisos de `deprecated` al compilar Android vienen de librerías de terceros,
  no de este código.
