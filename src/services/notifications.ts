// src/services/notifications.ts
// Servicio de notificaciones - equivalente a Managers/NotificationManager.swift

import {Platform} from 'react-native';
import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  AuthorizationStatus,
  RepeatFrequency,
} from '@notifee/react-native';
import {AndroidAlarmModule} from '../native/AndroidAlarmModule';
import i18n from '../i18n';
import {EVENT_CATEGORY_CONFIG} from '../types/enums';
import type {EventCategory} from '../types/enums';
import type {RoutineEvent, PendingNotification} from '../types';

const CHANNEL_ID = 'myroutine-alarms';
const NN_NOTIFICATION_ID = 'non_negotiables_daily';

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

/**
 * Texto de la notificación de alarma. Única fuente de verdad para Android e iOS:
 * en Android el aviso lo pinta AlarmPlaybackService (nativo) y en iOS lo pinta
 * notifee, así que el contenido se calcula aquí y se envía a cada plataforma.
 *
 * Antes, el cuerpo era la cadena fija "Time for your routine!" en iOS y
 * "Toca para abrir o cancela desde aquí" en Android, sin ninguna referencia a
 * la rutina: era imposible saber por qué estaba sonando.
 *
 * No se añadió ningún campo al modelo. `routineDescription`, `purpose` y
 * `objectives` ya existen y los rellena EventEditorScreen. Se descarta `notes`
 * a propósito: el editor siempre lo guarda vacío.
 */
export function buildAlarmContent(event: RoutineEvent): {title: string; body: string} {
  const config = EVENT_CATEGORY_CONFIG[event.categoryRaw as EventCategory];
  const emoji = config?.emoji ?? '⏰';
  const title = `${emoji} ${event.title}`.trim();

  const schedule = `${event.startTime}–${event.endTime}`;

  // Primer campo con contenido real; se recortan espacios por si quedó a blancos.
  const detail = [event.routineDescription, event.purpose, event.objectives]
    .map(v => v?.trim())
    .find(v => v && v.length > 0);

  const body = detail
    ? `${detail} · ${schedule}`
    : i18n.t('notifications.alarm_fallback', {title: event.title, schedule});

  return {title, body};
}

// Schedule alarm notifications for a routine
export async function scheduleAlarmsForRoutine(event: RoutineEvent): Promise<void> {
  await cancelNotificationsForEvent(event.id);

  if (!event.alarmEnabled) return;

  const alarmDays = event.alarmDaysRaw
    .split(',')
    .map(d => parseInt(d.trim(), 10))
    .filter(d => !isNaN(d) && d >= 1 && d <= 7);

  if (alarmDays.length === 0) return;

  const [alarmHour, alarmMinute] = event.alarmTime.split(':').map(Number);
  const content = buildAlarmContent(event);

  if (Platform.OS === 'android') {
    // Use AlarmManager.setAlarmClock() — guaranteed delivery, unaffected by Doze
    for (const day of alarmDays) {
      const triggerDate = getNextTriggerDate(day, alarmHour, alarmMinute);
      if (!triggerDate) continue;
      await AndroidAlarmModule.scheduleAlarm({
        id: `${event.id}_alarm_${day}`,
        hour: alarmHour,
        minute: alarmMinute,
        label: event.title,
        // Texto que mostrará la notificación del servicio nativo.
        notificationTitle: content.title,
        notificationBody: content.body,
        // Día de repetición en convención JS (0=domingo). Antes iba vacío, así
        // que si el nativo tenía que recalcular la hora (porque la enviada ya
        // había pasado) no sabía en qué día debía sonar y la ponía para hoy o
        // mañana. Es una rutina semanal: se repite ese día de la semana.
        repeatDays: [(day + 6) % 7],
        soundUri: null,
        soundId: null,
        volume: 80,
        vibrate: true,
        eventId: event.id,
        triggerTimeMs: triggerDate.getTime(),
      });
    }
    return;
  }

  // iOS — use notifee (AlarmKit is handled separately per alarm)
  for (const day of alarmDays) {
    const trigger = getNextTriggerDate(day, alarmHour, alarmMinute);
    if (!trigger) continue;

    const notificationId = `${event.id}_alarm_${day}`;

    await notifee.createTriggerNotification(
      {
        id: notificationId,
        title: content.title,
        body: content.body,
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
      } as TimestampTrigger,
    );
  }
}

// Schedule reminder notification
export async function scheduleReminderForRoutine(event: RoutineEvent): Promise<void> {
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
      body: i18n.t('notifications.reminder_body', {
        minutes: event.notifyMinutesBefore,
        schedule: `${event.startTime}–${event.endTime}`,
      }),
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

// ============ No Negociables ============
// Ver docs/no-negociables.md sección 4.2.

/**
 * Recordatorio diario para repasar los no negociables.
 *
 * Es el primer sitio de la app que usa RepeatFrequency.DAILY: todo lo demás
 * repite WEEKLY. Se usa notifee y no AlarmManager a propósito — esto es un
 * aviso discreto, no un despertador con sonido en bucle y pantalla completa.
 *
 * La hora es solo un recordatorio: el usuario puede responder en cualquier
 * momento del día (P4).
 */
export async function scheduleNonNegotiablesReminder(
  hour: number,
  minute: number,
  activeCount: number,
): Promise<void> {
  await cancelNonNegotiablesReminder();

  // P8: sin activos no se programa nada.
  if (activeCount <= 0) return;

  const trigger = new Date();
  trigger.setHours(hour, minute, 0, 0);
  // Si la hora de hoy ya pasó, la primera aparición es mañana. Un timestamp
  // pasado dispararía la notificación al instante.
  if (trigger.getTime() <= Date.now()) {
    trigger.setDate(trigger.getDate() + 1);
  }

  await notifee.createTriggerNotification(
    {
      id: NN_NOTIFICATION_ID,
      title: i18n.t('non_negotiables.reminder_title'),
      body: i18n.t('non_negotiables.reminder_body', {count: activeCount}),
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.DEFAULT,
        pressAction: {id: 'default'},
      },
      ios: {
        interruptionLevel: 'active',
      },
      data: {type: 'non_negotiables'},
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: trigger.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
    } as TimestampTrigger,
  );
}

export async function cancelNonNegotiablesReminder(): Promise<void> {
  await notifee.cancelNotification(NN_NOTIFICATION_ID).catch(() => {});
}

// Cancel all notifications for an event
export async function cancelNotificationsForEvent(eventId: string): Promise<void> {
  if (Platform.OS === 'android') {
    // Cancel AlarmManager alarms for all possible days (1–7)
    const cancels = Array.from({length: 7}, (_, i) =>
      AndroidAlarmModule.cancelAlarm(`${eventId}_alarm_${i + 1}`).catch(() => {}),
    );
    await Promise.all(cancels);
    // Also cancel any notifee reminder
    await notifee.cancelNotification(`${eventId}_reminder`).catch(() => {});
    return;
  }
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

  const pending: PendingNotification[] = [];

  for (const id of triggers) {
    if (id.includes('_alarm_')) {
      const parts = id.split('_alarm_');
      pending.push({
        id,
        title: 'Alarm',
        body: 'Scheduled alarm',
        date: new Date(),
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
// dayOfWeek: iOS weekday (1=Sun, 2=Mon, ..., 7=Sat) OR JS weekday (0-6)
export function getNextTriggerDate(dayOfWeek: number, hour: number, minute: number): Date | null {
  const now = new Date();
  const trigger = new Date();

  trigger.setHours(hour, minute, 0, 0);

  // iOS weekday (1–7) → JS weekday (0–6)
  const targetDay = dayOfWeek >= 1 && dayOfWeek <= 7
    ? (dayOfWeek + 6) % 7   // iOS: 1=Sun→0, 2=Mon→1, …, 7=Sat→6
    : dayOfWeek;             // already JS weekday

  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  let daysDiff = targetDay - currentDay;

  if (
    daysDiff < 0 ||
    (daysDiff === 0 &&
      (hour < currentHour || (hour === currentHour && minute <= currentMinute)))
  ) {
    daysDiff += 7;
  }

  trigger.setDate(trigger.getDate() + daysDiff);
  return trigger;
}
