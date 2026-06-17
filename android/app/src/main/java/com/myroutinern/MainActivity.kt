package com.myroutinern

import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.myroutinern.alarm.AndroidAlarmModule

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "MyRoutineRN"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    if (intent?.getStringExtra("navigateTo") == "AlarmRinging") {
      keepScreenOnForAlarm()
    }
    super.onCreate(savedInstanceState)
  }

  // When app is already running and a new alarm fires, Android calls onNewIntent.
  // setIntent() ensures getInitialAlarmIntent() returns the latest alarm data.
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    val alarmId = intent?.getStringExtra("alarmId")
    if (alarmId != null) {
      keepScreenOnForAlarm()
      val eventId = intent.getStringExtra("eventId")
      AndroidAlarmModule.emitAlarmFired(alarmId, eventId)
    }
  }

  // Keep screen on while the alarm UI is active (cleared by JS after dismiss)
  fun keepScreenOnForAlarm() {
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  fun clearAlarmScreenFlags() {
    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }
}
