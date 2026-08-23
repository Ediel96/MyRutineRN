package com.myroutinern.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class AndroidAlarmModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private var instance: AndroidAlarmModule? = null

        fun emitAlarmFired(alarmId: String, eventId: String?) {
            instance?.sendAlarmFiredEvent(alarmId, eventId)
        }
    }

    init {
        instance = this
    }

    override fun getName() = "AndroidAlarmModule"

    private fun alarmManager(): AlarmManager =
        reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    private fun sendAlarmFiredEvent(alarmId: String, eventId: String?) {
        val params = Arguments.createMap().apply {
            putString("alarmId", alarmId)
            if (eventId != null) putString("eventId", eventId)
        }
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("AlarmFired", params)
    }

    @ReactMethod
    fun hasExactAlarmPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            promise.resolve(alarmManager().canScheduleExactAlarms())
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestExactAlarmPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val intent = Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactApplicationContext.startActivity(intent)
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        val packageName = reactApplicationContext.packageName
        val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
        if (!pm.isIgnoringBatteryOptimizations(packageName)) {
            val intent = Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
            intent.data = android.net.Uri.parse("package:$packageName")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactApplicationContext.startActivity(intent)
        }
        promise.resolve(true)
    }

    @ReactMethod
    fun scheduleAlarm(config: ReadableMap, promise: Promise) {
        try {
            val id = config.getString("id") ?: throw IllegalArgumentException("Missing id")
            val hour = config.getInt("hour")
            val minute = config.getInt("minute")
            val label = config.getString("label") ?: ""
            val soundUri = if (config.hasKey("soundUri")) config.getString("soundUri") else null
            val soundId = if (config.hasKey("soundId")) config.getString("soundId") else null
            val volume = if (config.hasKey("volume")) config.getInt("volume") else 80
            val vibrate = if (config.hasKey("vibrate")) config.getBoolean("vibrate") else true
            val eventId = if (config.hasKey("eventId")) config.getString("eventId") else null
            val requestedTriggerMs =
                if (config.hasKey("triggerTimeMs")) config.getDouble("triggerTimeMs").toLong() else 0L

            // Dias de repeticion (0 = domingo ... 6 = sabado). Antes se recibian
            // pero no se usaban: nextTriggerTime() solo miraba hora y minuto, asi
            // que una alarma de "solo lunes" quedaba armada para hoy o manana.
            val repeatDays = if (config.hasKey("repeatDays")) {
                val arr = config.getArray("repeatDays")
                IntArray(arr?.size() ?: 0) { i -> arr!!.getInt(i) }
            } else {
                IntArray(0)
            }

            val triggerTime = AlarmScheduling.schedule(
                context = reactApplicationContext,
                alarmId = id,
                hour = hour,
                minute = minute,
                repeatDays = repeatDays,
                label = label,
                soundUri = soundUri,
                soundId = soundId,
                volume = volume,
                vibrate = vibrate,
                eventId = eventId,
                requestedTriggerMs = requestedTriggerMs,
            )

            android.util.Log.i("AndroidAlarmModule", "Alarma $id programada para $triggerTime")
            promise.resolve(id)
        } catch (e: Exception) {
            promise.reject("SCHEDULE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAlarm(alarmId: String, promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, AlarmTriggerReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                reactApplicationContext, alarmId.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager().cancel(pendingIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopPlayback(alarmId: String, promise: Promise) {
        try {
            val stopIntent = Intent(reactApplicationContext, AlarmPlaybackService::class.java)
            reactApplicationContext.stopService(stopIntent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun snoozeAlarm(alarmId: String, minutes: Int, promise: Promise) {
        try {
            val eventId = getCurrentActivity()?.intent?.getStringExtra("eventId")

            val stopIntent = Intent(reactApplicationContext, AlarmPlaybackService::class.java)
            reactApplicationContext.stopService(stopIntent)

            val snoozeMs = minutes * 60 * 1000L
            val triggerTime = System.currentTimeMillis() + snoozeMs

            val intent = Intent(reactApplicationContext, AlarmTriggerReceiver::class.java).apply {
                putExtra(AlarmScheduling.EXTRA_ALARM_ID, alarmId)
                putExtra("isSnooze", true)
                // El posponer es de un solo disparo: sin repeatDays el receptor
                // no intenta re-armarlo. scheduledAt permite descartar la
                // entrega si llega rancia tras un reinicio.
                putExtra(AlarmScheduling.EXTRA_SCHEDULED_AT, triggerTime)
                if (eventId != null) putExtra(AlarmScheduling.EXTRA_EVENT_ID, eventId)
            }
            val pendingIntent = PendingIntent.getBroadcast(
                reactApplicationContext,
                (alarmId + "_snooze").hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val showIntent = PendingIntent.getActivity(
                reactApplicationContext,
                (alarmId + "_snooze_show").hashCode(),
                Intent(reactApplicationContext, AlarmRingingActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTime, showIntent)
            alarmManager().setAlarmClock(alarmClockInfo, pendingIntent)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SNOOZE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun clearAlarmWindowFlags(promise: Promise) {
        val activity = getCurrentActivity()
        if (activity is com.myroutinern.MainActivity) {
            activity.runOnUiThread { activity.clearAlarmScreenFlags() }
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun getInitialAlarmIntent(promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity != null) {
                val alarmId = activity.intent?.getStringExtra("alarmId")
                if (alarmId != null) {
                    val map = Arguments.createMap()
                    map.putString("alarmId", alarmId)
                    val eventId = activity.intent?.getStringExtra("eventId")
                    if (eventId != null) map.putString("eventId", eventId)
                    promise.resolve(map)
                } else {
                    promise.resolve(null)
                }
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("INTENT_ERROR", e.message, e)
        }
    }
}
