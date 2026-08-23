package com.myroutinern.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class AlarmTriggerReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getStringExtra(AlarmScheduling.EXTRA_ALARM_ID) ?: return
        val label = intent.getStringExtra(AlarmScheduling.EXTRA_LABEL) ?: ""
        val soundUri = intent.getStringExtra(AlarmScheduling.EXTRA_SOUND_URI)
        val soundId = intent.getStringExtra(AlarmScheduling.EXTRA_SOUND_ID)
        val volume = intent.getIntExtra(AlarmScheduling.EXTRA_VOLUME, 80)
        val vibrate = intent.getBooleanExtra(AlarmScheduling.EXTRA_VIBRATE, true)
        val eventId = intent.getStringExtra(AlarmScheduling.EXTRA_EVENT_ID)
        val repeatDays = intent.getIntArrayExtra(AlarmScheduling.EXTRA_REPEAT_DAYS) ?: IntArray(0)
        val hour = intent.getIntExtra(AlarmScheduling.EXTRA_HOUR, -1)
        val minute = intent.getIntExtra(AlarmScheduling.EXTRA_MINUTE, -1)
        val scheduledAt = intent.getLongExtra(AlarmScheduling.EXTRA_SCHEDULED_AT, 0L)

        val now = System.currentTimeMillis()
        val lateBy = if (scheduledAt > 0L) now - scheduledAt else 0L

        // Guarda contra entregas rancias.
        //
        // Al reiniciar el movil (sobre todo tras estar apagado un rato), el
        // sistema puede entregar alarmas cuya hora ya paso, y el reloj puede
        // corregirse de golpe justo despues del arranque. Sin esta comprobacion
        // la alarma suena en cuanto enciendes el telefono, que es exactamente
        // el sintoma que habia.
        //
        // Si llega demasiado tarde no se hace sonar: solo se re-arma la
        // siguiente ocurrencia.
        if (lateBy > AlarmScheduling.LATE_TOLERANCE_MS) {
            Log.w(
                "AlarmTriggerReceiver",
                "Alarma $alarmId descartada: llega ${lateBy / 1000}s tarde (entrega rancia tras reinicio o cambio de hora)",
            )
            rearmIfRepeating(context, alarmId, hour, minute, repeatDays, label, soundUri, soundId, volume, vibrate, eventId)
            return
        }

        val serviceIntent = Intent(context, AlarmPlaybackService::class.java).apply {
            putExtra(AlarmScheduling.EXTRA_ALARM_ID, alarmId)
            putExtra(AlarmScheduling.EXTRA_SOUND_URI, soundUri)
            putExtra(AlarmScheduling.EXTRA_SOUND_ID, soundId)
            putExtra(AlarmScheduling.EXTRA_VOLUME, volume)
            putExtra(AlarmScheduling.EXTRA_VIBRATE, vibrate)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }

        val activityIntent = Intent(context, AlarmRingingActivity::class.java).apply {
            putExtra(AlarmScheduling.EXTRA_ALARM_ID, alarmId)
            putExtra(AlarmScheduling.EXTRA_LABEL, label)
            if (eventId != null) putExtra(AlarmScheduling.EXTRA_EVENT_ID, eventId)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
        }
        context.startActivity(activityIntent)

        AndroidAlarmModule.emitAlarmFired(alarmId, eventId)

        // setAlarmClock() es de un solo disparo: sin esto, una alarma que se
        // repite no volvia a sonar hasta que se reiniciaba el movil o se abria
        // la app. Ahora cada disparo deja armada la siguiente ocurrencia.
        rearmIfRepeating(context, alarmId, hour, minute, repeatDays, label, soundUri, soundId, volume, vibrate, eventId)
    }

    private fun rearmIfRepeating(
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
    ) {
        if (repeatDays.isEmpty()) return          // alarma de una sola vez
        if (hour !in 0..23 || minute !in 0..59) return  // sin datos para recalcular

        try {
            AlarmScheduling.schedule(
                context = context,
                alarmId = alarmId,
                hour = hour,
                minute = minute,
                repeatDays = repeatDays,
                label = label,
                soundUri = soundUri,
                soundId = soundId,
                volume = volume,
                vibrate = vibrate,
                eventId = eventId,
            )
        } catch (e: Exception) {
            Log.e("AlarmTriggerReceiver", "No se pudo re-armar la alarma $alarmId", e)
        }
    }
}
