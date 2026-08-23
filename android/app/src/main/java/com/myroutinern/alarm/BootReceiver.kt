package com.myroutinern.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Re-programa las alarmas cuando el sistema pierde las que tenia armadas.
 *
 * AlarmManager no conserva nada al reiniciar, y ademas hay varios eventos que
 * invalidan las horas ya calculadas. Antes solo se escuchaba BOOT_COMPLETED,
 * lo que dejaba fuera:
 *
 *  - LOCKED_BOOT_COMPLETED: en dispositivos con arranque directo llega antes de
 *    que el usuario desbloquee; sin el, hay una ventana sin alarmas armadas.
 *  - QUICKBOOT_POWERON / HTC_QUICKBOOT_POWERON: Samsung y HTC usan estas en vez
 *    de BOOT_COMPLETED cuando el "arranque rapido" esta activo.
 *  - MY_PACKAGE_REPLACED: al actualizar la app se pierden las alarmas armadas.
 *  - TIME_SET / TIMEZONE_CHANGED: si el movil estuvo apagado un tiempo, al
 *    encender el reloj se corrige de golpe. Las alarmas armadas contra el reloj
 *    anterior quedan desfasadas y pueden dispararse al instante.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private val HANDLED_ACTIONS = setOf(
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_LOCKED_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED,
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON",
        )
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action !in HANDLED_ACTIONS) return

        Log.i("BootReceiver", "Re-programando alarmas tras: $action")
        try {
            RescheduleAlarmsService.start(context)
        } catch (e: Exception) {
            // En Android 12+ arrancar servicios en segundo plano esta limitado.
            // Si falla, las alarmas se re-arman igualmente al abrir la app.
            Log.e("BootReceiver", "No se pudo arrancar el servicio de re-programacion", e)
        }
    }
}
