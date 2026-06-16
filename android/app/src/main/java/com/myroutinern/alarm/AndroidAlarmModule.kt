package com.myroutinern.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*
import java.util.Calendar

class AndroidAlarmModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AndroidAlarmModule"

    private fun alarmManager(): AlarmManager =
        reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

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

            val triggerTime = nextTriggerTime(hour, minute)

            val intent = Intent(reactApplicationContext, AlarmTriggerReceiver::class.java).apply {
                putExtra("alarmId", id)
                putExtra("label", label)
                putExtra("soundUri", soundUri)
                putExtra("soundId", soundId)
                putExtra("volume", volume)
                putExtra("vibrate", vibrate)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                reactApplicationContext, id.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // setAlarmClock() — API correcta para apps tipo despertador, no afectada por Doze
            val showIntent = PendingIntent.getActivity(
                reactApplicationContext, id.hashCode(),
                Intent(reactApplicationContext, AlarmRingingActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTime, showIntent)
            alarmManager().setAlarmClock(alarmClockInfo, pendingIntent)

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
            // Para snooze: detener el servicio de reproducción y reprogramar la alarma
            val stopIntent = Intent(reactApplicationContext, AlarmPlaybackService::class.java)
            reactApplicationContext.stopService(stopIntent)

            val snoozeMs = minutes * 60 * 1000L
            val triggerTime = System.currentTimeMillis() + snoozeMs

            val intent = Intent(reactApplicationContext, AlarmTriggerReceiver::class.java).apply {
                putExtra("alarmId", alarmId)
                putExtra("isSnooze", true)
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
    fun getInitialAlarmIntent(promise: Promise) {
        try {
            val activity = getCurrentActivity()
            if (activity != null) {
                val alarmId = activity.intent?.getStringExtra("alarmId")
                if (alarmId != null) {
                    val map = Arguments.createMap()
                    map.putString("alarmId", alarmId)
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

    private fun nextTriggerTime(hour: Int, minute: Int): Long {
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.HOUR_OF_DAY, hour)
        calendar.set(Calendar.MINUTE, minute)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        if (calendar.timeInMillis <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_MONTH, 1)
        }
        return calendar.timeInMillis
    }
}
