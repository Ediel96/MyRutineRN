package com.myroutinern.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

/**
 * Logica compartida de programacion de alarmas.
 *
 * Vive fuera de AndroidAlarmModule porque AlarmTriggerReceiver tambien la
 * necesita para re-armar la siguiente ocurrencia, y un BroadcastReceiver no
 * tiene acceso al contexto de React.
 */
object AlarmScheduling {

    const val EXTRA_ALARM_ID = "alarmId"
    const val EXTRA_LABEL = "label"
    const val EXTRA_SOUND_URI = "soundUri"
    const val EXTRA_SOUND_ID = "soundId"
    const val EXTRA_VOLUME = "volume"
    const val EXTRA_VIBRATE = "vibrate"
    const val EXTRA_EVENT_ID = "eventId"
    const val EXTRA_REPEAT_DAYS = "repeatDays"
    const val EXTRA_HOUR = "hour"
    const val EXTRA_MINUTE = "minute"

    /** Texto de la notificacion, calculado en JS por buildAlarmContent(). */
    const val EXTRA_NOTIF_TITLE = "notificationTitle"
    const val EXTRA_NOTIF_BODY = "notificationBody"

    /** Momento para el que se programo la alarma, para detectar entregas rancias. */
    const val EXTRA_SCHEDULED_AT = "scheduledAtMs"

    /**
     * Margen de tolerancia. Si una alarma llega con mas retraso que esto, se
     * considera una entrega rancia (tipicamente al reiniciar el movil tras
     * estar apagado) y NO se hace sonar: solo se re-arma la siguiente.
     *
     * 5 minutos cubre el retraso normal de Doze sin dejar pasar una alarma de
     * hace horas o dias.
     */
    const val LATE_TOLERANCE_MS = 5 * 60 * 1000L

    /**
     * Siguiente instante en que debe sonar la alarma.
     *
     * `repeatDays` usa la convencion de JS (0 = domingo ... 6 = sabado), igual
     * que el tipo AlarmRepeatDay. Una lista vacia significa "una sola vez".
     *
     * La version anterior de esta funcion solo recibia hora y minuto e ignoraba
     * por completo los dias de repeticion, asi que programaba para hoy o manana
     * sin mirar en que dias debia sonar la alarma. Ese era el motivo de que tras
     * reiniciar el movil sonaran alarmas en dias que no tocaban.
     */
    @JvmStatic
    fun nextTriggerTime(
        hour: Int,
        minute: Int,
        repeatDays: IntArray,
        from: Long = System.currentTimeMillis(),
    ): Long {
        val base = Calendar.getInstance().apply {
            timeInMillis = from
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        // Sin repeticion: hoy si aun no ha pasado, si no manana.
        if (repeatDays.isEmpty()) {
            if (base.timeInMillis <= from) base.add(Calendar.DAY_OF_MONTH, 1)
            return base.timeInMillis
        }

        // Con repeticion: primer dia de la lista que caiga estrictamente en el
        // futuro. Se prueban 8 desplazamientos para cubrir el caso de que hoy
        // sea un dia valido pero la hora ya haya pasado (se va a la semana que
        // viene). Usar Calendar en vez de sumar milisegundos respeta los
        // cambios de horario de verano.
        for (offset in 0..7) {
            val probe = (base.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, offset) }
            val jsDayOfWeek = probe.get(Calendar.DAY_OF_WEEK) - 1 // Calendar: 1=domingo -> 0
            if (repeatDays.contains(jsDayOfWeek) && probe.timeInMillis > from) {
                return probe.timeInMillis
            }
        }

        // Inalcanzable con una lista valida, pero nunca devolvemos una fecha
        // pasada: setAlarmClock() con hora pasada dispara al instante.
        return base.timeInMillis + 7L * 24 * 60 * 60 * 1000
    }

    /**
     * Programa la alarma con AlarmManager.setAlarmClock().
     *
     * Devuelve el instante para el que quedo programada.
     */
    @JvmStatic
    fun schedule(
        context: Context,
        alarmId: String,
        hour: Int,
        minute: Int,
        repeatDays: IntArray,
        label: String,
        soundUri: String?,
        soundId: String?,
        volume: Int,
        vibrate: Boolean,
        eventId: String?,
        notificationTitle: String? = null,
        notificationBody: String? = null,
        requestedTriggerMs: Long = 0L,
    ): Long {
        // Solo se acepta la hora que viene de JS si esta en el futuro. Un
        // timestamp pasado (calculo obsoleto, o el reloj del sistema
        // corrigiendose tras el arranque) haria sonar la alarma al instante.
        val now = System.currentTimeMillis()
        val triggerTime = if (requestedTriggerMs > now) {
            requestedTriggerMs
        } else {
            nextTriggerTime(hour, minute, repeatDays, now)
        }

        val intent = Intent(context, AlarmTriggerReceiver::class.java).apply {
            putExtra(EXTRA_ALARM_ID, alarmId)
            putExtra(EXTRA_LABEL, label)
            putExtra(EXTRA_SOUND_URI, soundUri)
            putExtra(EXTRA_SOUND_ID, soundId)
            putExtra(EXTRA_VOLUME, volume)
            putExtra(EXTRA_VIBRATE, vibrate)
            putExtra(EXTRA_REPEAT_DAYS, repeatDays)
            putExtra(EXTRA_HOUR, hour)
            putExtra(EXTRA_MINUTE, minute)
            putExtra(EXTRA_SCHEDULED_AT, triggerTime)
            putExtra(EXTRA_NOTIF_TITLE, notificationTitle)
            putExtra(EXTRA_NOTIF_BODY, notificationBody)
            if (eventId != null) putExtra(EXTRA_EVENT_ID, eventId)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context, alarmId.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val showIntent = PendingIntent.getActivity(
            context, alarmId.hashCode(),
            Intent(context, AlarmRingingActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(triggerTime, showIntent), pendingIntent)

        return triggerTime
    }
}
