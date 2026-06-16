package com.myroutinern.alarm

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import com.myroutinern.MainActivity

class AlarmRingingActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val alarmId = intent?.getStringExtra("alarmId") ?: ""
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("alarmId", alarmId)
            putExtra("navigateTo", "AlarmRinging")
        }
        startActivity(mainIntent)
        finish()
    }
}
