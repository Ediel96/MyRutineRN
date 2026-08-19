# ---------------------------------------------------------------------------
# Reglas de R8 / ProGuard para MyRoutine
#
# R8 elimina todo el codigo al que no llega siguiendo las llamadas desde los
# puntos de entrada. Lo que se invoca por reflexion o desde codigo nativo (JNI)
# es invisible para ese analisis, asi que hay que protegerlo aqui a mano.
#
# Si un build de release falla con ClassNotFoundException, NoSuchMethodError o
# un modulo nativo que "no existe", el arreglo es anadir un -keep aqui, NO
# desactivar minifyEnabled.
#
# Para depurar que elimino R8, mira despues de un build de release:
#   android/app/build/outputs/mapping/release/usage.txt    (lo eliminado)
#   android/app/build/outputs/mapping/release/mapping.txt  (renombrados)
# ---------------------------------------------------------------------------

# --- React Native: nucleo -------------------------------------------------
# El puente JS<->nativo resuelve clases y metodos por nombre en tiempo de
# ejecucion, por eso hay que conservar las anotaciones y lo que marcan.
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStripAny
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keep @com.facebook.common.internal.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
    @com.facebook.common.internal.DoNotStrip *;
}
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
    void set*(***);
    *** get*();
}

# JNI: llamado desde C++, invisible para el analisis estatico.
-keep class com.facebook.jni.** { *; }
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

# TurboModules y componentes Fabric (nueva arquitectura).
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }
-keep class * extends com.facebook.react.bridge.BaseJavaModule { *; }
-keep class * extends com.facebook.react.ReactPackage { *; }
-keep class * extends com.facebook.react.TurboReactPackage { *; }
-keep class * extends com.facebook.react.BaseReactPackage { *; }
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# Hermes.
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jsi.** { *; }

# --- Codigo propio -------------------------------------------------------
# Los modulos nativos de alarma se instancian por nombre desde el puente de RN
# y desde el AndroidManifest. Nuestro codigo es pequeno, asi que conservarlo
# entero no cuesta tamano y evita fallos sutiles en runtime.
-keep class com.myroutinern.** { *; }

# --- Librerias de terceros ------------------------------------------------
# La mayoria trae sus propias reglas dentro del AAR. Estas son refuerzos sobre
# las partes que usan reflexion.

# Notifee: notificaciones y triggers.
-keep class io.invertase.notifee.** { *; }
-keep class app.notifee.** { *; }

# MMKV: almacenamiento nativo.
-keep class com.tencent.mmkv.** { *; }

# Keychain: donde viven las claves de API.
-keep class com.oblador.keychain.** { *; }

# Reanimated y Worklets: ejecutan codigo en un runtime JS aparte.
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.swmansion.gesturehandler.** { *; }

# Nitro Modules.
-keep class com.margelo.nitro.** { *; }

# --- Networking (axios -> OkHttp) ----------------------------------------
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# --- Kotlin ---------------------------------------------------------------
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings {
    <fields>;
}

# --- Conserva numeros de linea en los stack traces de release -------------
# Sin esto, un crash en produccion es ilegible. Cuesta unos pocos KB.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Anotaciones necesarias para generics y reflexion.
-keepattributes Signature,InnerClasses,EnclosingMethod,*Annotation*
