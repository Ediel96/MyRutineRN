// src/types/nonNegotiable.ts
// Modelo de "No Negociables" — ver docs/no-negociables.md

/**
 * 'simple'     — el usuario solo define título y emoji. Único tipo en la v1.
 * 'calculated' — derivado de datos de perfil (ej. "2 g de proteína por kg").
 *                Reservado para v2: el campo existe desde ahora para no tener
 *                que migrar datos ya guardados cuando llegue.
 */
export type NonNegotiableKind = 'simple' | 'calculated';

export interface NonNegotiable {
  id: string;
  title: string;
  emoji: string;
  kind: NonNegotiableKind;
  /** Solo si kind === 'calculated'. En v1 siempre null. */
  formulaRaw: string | null;
  /** Desactivar en vez de borrar: conserva el historial de los días en que existía. */
  isActive: boolean;
  order: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/**
 * 'pending' — el día está abierto y aún no se ha respondido.
 * 'done'    — cumplido.
 * 'missed'  — no cumplido, ya sea declarado por el usuario o por cierre del día.
 */
export type NonNegotiableStatus = 'pending' | 'done' | 'missed';

export interface NonNegotiableRecord {
  id: string;
  nonNegotiableId: string;
  /**
   * Día civil LOCAL en formato "YYYY-MM-DD".
   *
   * A diferencia de CompletionRecord.date (que guarda un ISO completo y luego
   * normaliza a medianoche al comparar), aquí la clave es el día civil directo.
   * Componerla siempre con getFullYear/getMonth/getDate locales: toISOString()
   * convierte a UTC y desplaza el día para cualquiera al oeste de Greenwich.
   */
  date: string;
  status: NonNegotiableStatus;
  /** ISO del momento de responder; null si nunca se respondió. */
  respondedAt: string | null;
}

/** Máximo de no negociables ACTIVOS. Los desactivados no ocupan cupo. */
export const MAX_ACTIVE_NON_NEGOTIABLES = 7;

/** Ventana del porcentaje de cumplimiento individual, en días. */
export const COMPLETION_WINDOW_DAYS = 30;

/**
 * Por debajo de este número de días exigibles se muestra el conteo bruto
 * ("3 de 4 días") en vez de un porcentaje: un porcentaje sobre 3 días no
 * informa de nada.
 */
export const MIN_DAYS_FOR_PERCENTAGE = 7;
