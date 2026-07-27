package com.myroutinern.alarm

import android.app.*
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import com.myroutinern.MainActivity

class AlarmPlaybackService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    companion object {
        const val CHANNEL_ID = "alarm_playback_channel"
        const val NOTIFICATION_ID = 9001
        const val ACTION_STOP = "com.myroutinern.alarm.STOP"
    }

    private var currentAlarmId: String = ""
    private var currentEventId: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopPlayback()
            return START_NOT_STICKY
        }

        val soundUri = intent?.getStringExtra("soundUri")
        val soundId  = intent?.getStringExtra("soundId")
        val volume   = intent?.getIntExtra("volume", 80) ?: 80
        val vibrate  = intent?.getBooleanExtra("vibrate", true) ?: true
        currentAlarmId = intent?.getStringExtra("alarmId") ?: ""
        currentEventId = intent?.getStringExtra("eventId")

        startForegroundNotification(currentAlarmId, currentEventId)
        playSound(soundUri, soundId, volume)
        if (vibrate) startVibration()

        return START_STICKY
    }

    private fun startForegroundNotification(alarmId: String, eventId: String?) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Reproducción de alarma", NotificationManager.IMPORTANCE_HIGH
            ).apply {
                // El sonido viene del MediaPlayer — silenciar el canal para evitar doble sonido
                setSound(null, null)
                enableVibration(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        // Tap notificación → abre AlarmRinging en la app
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("alarmId", alarmId)
            putExtra("navigateTo", "AlarmRinging")
            if (eventId != null) putExtra("eventId", eventId)
        }
        val openPending = PendingIntent.getActivity(
            this, NOTIFICATION_ID, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Botón "Cancelar" en la notificación → detiene el servicio
        val stopIntent = Intent(this, AlarmPlaybackService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPending = PendingIntent.getService(
            this, NOTIFICATION_ID + 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("⏰ Alarma sonando")
            .setContentText("Toca para abrir o cancela desde aquí")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentIntent(openPending)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Cancelar", stopPending)
            .build()
        startForeground(NOTIFICATION_ID, notification)
    }

    private fun playSound(soundUri: String?, soundId: String?, volume: Int) {
        val uri: Uri = if (soundUri != null) {
            Uri.parse(soundUri)
        } else {
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        }

        try {
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setDataSource(this@AlarmPlaybackService, uri)
                isLooping = true
                setVolume(volume / 100f, volume / 100f)
                prepare()
                start()
            }
        } catch (e: Exception) {
            // Si falla el sonido custom, caer al ringtone por defecto
            if (soundUri != null) {
                playSound(null, null, volume)
            }
        }
    }

    private fun startVibration() {
        vibrator = getSystemService(Vibrator::class.java)
        val pattern = longArrayOf(0, 800, 400)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(pattern, 0)
        }
    }

    private fun stopPlayback() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        vibrator?.cancel()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    override fun onDestroy() {
        stopPlayback()
        super.onDestroy()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        stopPlayback()
        super.onTaskRemoved(rootIntent)
    }
}
