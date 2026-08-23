// src/services/nonNegotiablesLogic.ts
// Lógica pura de No Negociables: fechas, racha y porcentajes.
//
// Este módulo NO importa react-native, MMKV ni el store. Es a propósito: es la
// única parte del proyecto con reglas temporales no triviales, y mantenerla
// pura permite testearla con Jest sin módulos nativos ni simuladores.
// El store (nonNegotiablesStore.ts) la conecta con el almacenamiento.
//
// Ver docs/no-negociables.md secciones 2.2 a 2.5.

import type {
  NonNegotiable,
  NonNegotiableRecord,
  NonNegotiableStatus,
} from '../types/nonNegotiable';
import {COMPLETION_WINDOW_DAYS, MIN_DAYS_FOR_PERCENTAGE} from '../types/nonNegotiable';

// ---------------------------------------------------------------------------
// Fechas
//
// Regla del proyecto: NUNCA hacer aritmética de días restando milisegundos.
// Con horario de verano un día dura 23 o 25 horas y `t - 86400000` cae en la
// fecha equivocada. Se construye siempre la fecha con el constructor, que
// normaliza correctamente.
// ---------------------------------------------------------------------------

const pad = (n: number) => n.toString().padStart(2, '0');

/** Día civil LOCAL como "YYYY-MM-DD". No usar toISOString(): desplaza a UTC. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" → Date a medianoche local. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Suma (o resta) días de forma segura frente a cambios de horario. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// ---------------------------------------------------------------------------
// Estado efectivo
// ---------------------------------------------------------------------------

/**
 * Estado real de un registro en el momento de leerlo.
 *
 * Un 'pending' de un día ya cerrado cuenta como 'missed'. Se resuelve en
 * lectura y no con una tarea a medianoche: menos piezas móviles y sobrevive a
 * que el móvil esté apagado.
 */
export function effectiveStatus(
  record: NonNegotiableRecord,
  todayKey: string,
): NonNegotiableStatus {
  if (record.status === 'pending' && record.date < todayKey) return 'missed';
  return record.status;
}

/** Los no negociables que ocupan cupo. Los desactivados conservan historial. */
export function activeNonNegotiables(items: NonNegotiable[]): NonNegotiable[] {
  return items.filter(n => n.isActive).sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Racha global
// ---------------------------------------------------------------------------

/** Tope de seguridad: evita un bucle infinito si los datos vinieran corruptos. */
const MAX_STREAK_LOOKBACK_DAYS = 3650;

/**
 * Racha global: días consecutivos en los que TODOS los no negociables
 * exigibles quedaron cumplidos.
 *
 * Qué se exige cada día lo dicen los propios registros, no la bandera
 * isActive: al observar un día se crean registros 'pending' para los activos de
 * ese momento, congelando ahí el conjunto. Así, desactivar uno después no puede
 * reescribir el pasado y "arreglar" un día fallado.
 *
 * Dos matices:
 *  - El día EN CURSO no rompe la racha mientras siga abierto. Si a las 10:00
 *    llevas 0 de 3, aún tienes el día por delante.
 *  - Un día pasado SIN NINGÚN registro sí la rompe: es alguien que no abrió la
 *    app, y no responder es no cumplir.
 */
export function calculateGlobalStreak(
  records: NonNegotiableRecord[],
  now: Date,
): number {
  const todayKey = toDateKey(now);

  // Índice por día para no recorrer el array completo en cada iteración.
  const byDate = new Map<string, NonNegotiableRecord[]>();
  for (const r of records) {
    const list = byDate.get(r.date);
    if (list) list.push(r);
    else byDate.set(r.date, [r]);
  }

  let streak = 0;
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
    const key = toDateKey(cursor);
    const dayRecords = byDate.get(key) ?? [];
    const allDone =
      dayRecords.length > 0 &&
      dayRecords.every(r => effectiveStatus(r, todayKey) === 'done');

    if (key === todayKey && !allDone) {
      // Día abierto y aún incompleto: no suma, pero tampoco corta.
      cursor = addDays(cursor, -1);
      continue;
    }

    if (!allDone) break;

    streak++;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

// ---------------------------------------------------------------------------
// Porcentaje individual
// ---------------------------------------------------------------------------

export interface CompletionStats {
  /** Días cumplidos dentro de la ventana. */
  done: number;
  /** Días EXIGIBLES dentro de la ventana (los que tienen registro). */
  total: number;
  /**
   * 0–100, o null si hay muy pocos días para que un porcentaje signifique algo.
   * Con null, la UI muestra el conteo bruto.
   */
  rate: number | null;
}

/**
 * Cumplimiento de un no negociable en los últimos COMPLETION_WINDOW_DAYS días.
 *
 * El denominador son los días EXIGIBLES, no los 30 fijos: uno creado hace 4
 * días debe mostrar 3/4 = 75 %, no 3/30 = 10 %, que sería falso y
 * desmoralizante. Los días en que estuvo desactivado no tienen registro, así
 * que tampoco cuentan.
 *
 * El día en curso solo se incluye si ya se respondió: un 'pending' de hoy no
 * debe contar como fallo mientras el día siga abierto.
 */
export function getCompletionStats(
  records: NonNegotiableRecord[],
  nonNegotiableId: string,
  now: Date,
): CompletionStats {
  const todayKey = toDateKey(now);
  const fromKey = toDateKey(addDays(now, -(COMPLETION_WINDOW_DAYS - 1)));

  let done = 0;
  let total = 0;

  for (const r of records) {
    if (r.nonNegotiableId !== nonNegotiableId) continue;
    if (r.date < fromKey || r.date > todayKey) continue;

    const status = effectiveStatus(r, todayKey);
    if (status === 'pending') continue; // hoy sin responder: aún no cuenta

    total++;
    if (status === 'done') done++;
  }

  const rate =
    total >= MIN_DAYS_FOR_PERCENTAGE ? Math.round((done / total) * 100) : null;

  return {done, total, rate};
}
