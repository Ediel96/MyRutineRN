package com.myroutinern.alarm

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * HeadlessJsTaskService que re-programa todas las alarmas habilitadas tras un reinicio.
 * setAlarmClock() no sobrevive reinicios — este servicio las restaura.
 *
 * En JS, registrar el handler con:
 *   AppRegistry.registerHeadlessTask('RescheduleAlarms', () => rescheduleAlarmsTask)
 *
 * La tarea JS lee el store de MMKV, filtra alarmas enabled, y llama AlarmService.schedule().
 */
class RescheduleAlarmsService : HeadlessJsTaskService() {

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val extras = intent?.extras ?: Bundle()
        return HeadlessJsTaskConfig(
            "RescheduleAlarms",
            Arguments.fromBundle(extras),
            5_000L,
            false
        )
    }

    companion object {
        fun start(context: Context) {
            val serviceIntent = Intent(context, RescheduleAlarmsService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        }
    }
}
