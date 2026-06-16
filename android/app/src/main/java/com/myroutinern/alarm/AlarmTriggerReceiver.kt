package com.myroutinern.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmTriggerReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val alarmId  = intent.getStringExtra("alarmId") ?: return
        val label    = intent.getStringExtra("label") ?: ""
        val soundUri = intent.getStringExtra("soundUri")
        val soundId  = intent.getStringExtra("soundId")
        val volume   = intent.getIntExtra("volume", 80)
        val vibrate  = intent.getBooleanExtra("vibrate", true)

        val serviceIntent = Intent(context, AlarmPlaybackService::class.java).apply {
            putExtra("alarmId", alarmId)
            putExtra("soundUri", soundUri)
            putExtra("soundId", soundId)
            putExtra("volume", volume)
            putExtra("vibrate", vibrate)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }

        val activityIntent = Intent(context, AlarmRingingActivity::class.java).apply {
            putExtra("alarmId", alarmId)
            putExtra("label", label)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
        }
        context.startActivity(activityIntent)
    }
}
