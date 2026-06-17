// src/services/notifications.ts
// Servicio de notificaciones - equivalente a Managers/NotificationManager.swift

import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  AuthorizationStatus,
  RepeatFrequency,
} from '@notifee/react-native';
import type {RoutineEvent, PendingNotification} from '../types';

const CHANNEL_ID = 'myroutine-alarms';

// Initialize notification channel (Android)
export async function setupNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Routine Alarms',
    importance: AndroidImportance.HIGH,
  });
}

// Request notification permissions
export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

// Check authorization status
export async function checkAuthorizationStatus(): Promise<AuthorizationStatus> {
  return await notifee.getNotificationSettings().then(s => s.authorizationStatus);
}

// Schedule alarm notifications for a routine
export async function scheduleAlarmsForRoutine(event: RoutineEvent): Promise<void> {
  // Cancel existing notifications for this event
  await cancelNotificationsForEvent(event.id);

  if (!event.alarmEnabled) return;

  const alarmDays = event.alarmDaysRaw
    .split(',')
    .map(d => parseInt(d.trim(), 10))
    .filter(d => !isNaN(d) && d >= 1 && d <= 7);

  if (alarmDays.length === 0) return;

  const [alarmHour, alarmMinute] = event.alarmTime.split(':').map(Number);

  for (const day of alarmDays) {
    const trigger = getNextTriggerDate(day, alarmHour, alarmMinute);
    if (!trigger) continue;

    const notificationId = `${event.id}_alarm_${day}`;

    await notifee.createTriggerNotification(
      {
        id: notificationId,
        title: `⏰ ${event.title}`,
        body: 'Time for your routine!',
        android: {
          channelId: CHANNEL_ID,
          importance: AndroidImportance.HIGH,
          pressAction: {id: 'default'},
        },
        ios: {
          interruptionLevel: 'timeSensitive',
        },
        data: {
          eventId: event.id,
          type: 'alarm',
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: trigger.getTime(),
        repeatFrequency: RepeatFrequency.WEEKLY,
        alarmManager: {
          allowWhileIdle: true,
        },
      } as TimestampTrigger,
    );
  }
}

// Schedule reminder notification
export async function scheduleReminderForRoutine(event: RoutineEvent): Promise<void> {
  // Cancel existing reminder
  await notifee.cancelNotification(`${event.id}_reminder`);

  if (event.notifyMinutesBefore <= 0) return;

  const [startHour, startMinute] = event.startTime.split(':').map(Number);
  const dayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  const dayNum = dayMap[event.dayRaw] ?? 1;

  const trigger = getNextTriggerDate(dayNum, startHour, startMinute);
  if (!trigger) return;

  trigger.setMinutes(trigger.getMinutes() - event.notifyMinutesBefore);
  if (trigger.getTime() <= Date.now()) {
    trigger.setDate(trigger.getDate() + 7);
  }

  await notifee.createTriggerNotification(
    {
      id: `${event.id}_reminder`,
      title: `📝 ${event.title}`,
      body: `Starting in ${event.notifyMinutesBefore} minutes`,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.DEFAULT,
        pressAction: {id: 'default'},
      },
      data: {
        eventId: event.id,
        type: 'reminder',
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: trigger.getTime(),
      repeatFrequency: RepeatFrequency.WEEKLY,
    } as TimestampTrigger,
  );
}

// Cancel all notifications for an event
export async function cancelNotificationsForEvent(eventId: string): Promise<void> {
  const notifications = await notifee.getTriggerNotificationIds();
  const toCancel = notifications.filter(id => id.startsWith(`${eventId}_`));
  for (const id of toCancel) {
    await notifee.cancelNotification(id);
  }
}

// Cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
  await notifee.cancelAllNotifications();
}

// Get pending notifications for diagnostics
export async function getPendingNotifications(): Promise<PendingNotification[]> {
  const triggers = await notifee.getTriggerNotificationIds();

  // notifee doesn't provide full details of pending triggers
  // This is a simplified implementation
  const pending: PendingNotification[] = [];

  for (const id of triggers) {
    // Extract event info from ID pattern
    if (id.includes('_alarm_')) {
      const parts = id.split('_alarm_');
      pending.push({
        id,
        title: 'Alarm',
        body: 'Scheduled alarm',
        date: new Date(), // Would need actual date from notifee
        routineId: parts[0],
        routineTitle: 'Routine',
      });
    }
  }

  return pending;
}

// Send test notification
export async function sendTestNotification(): Promise<void> {
  await notifee.displayNotification({
    title: '🔔 Test Notification',
    body: 'Notifications are working correctly!',
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
    },
    ios: {
      interruptionLevel: 'timeSensitive',
    },
  });
}

// Reschedule all notifications
export async function rescheduleAllNotifications(events: RoutineEvent[]): Promise<void> {
  await cancelAllNotifications();
  for (const event of events) {
    await scheduleAlarmsForRoutine(event);
    await scheduleReminderForRoutine(event);
  }
}

// Helper: get next date for a weekday at specific time
function getNextTriggerDate(dayOfWeek: number, hour: number, minute: number): Date | null {
  const now = new Date();
  const trigger = new Date();

  trigger.setHours(hour, minute, 0, 0);

  // iOS weekday: 1=Sun, 2=Mon, ..., 7=Sat
  // JavaScript: 0=Sun, 1=Mon, ..., 6=Sat
  const targetDay = (dayOfWeek + 6) % 7;
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  let daysDiff = targetDay - currentDay;

  if (daysDiff < 0 || (daysDiff === 0 && (hour < currentHour || (hour === currentHour && minute <= currentMinute)))) {
    daysDiff += 7;
  }

  trigger.setDate(trigger.getDate() + daysDiff);
  return trigger;
}