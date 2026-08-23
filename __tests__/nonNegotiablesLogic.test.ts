/**
 * Tests de la lógica de No Negociables.
 * Ver docs/no-negociables.md sección 5.1.
 *
 * El módulo bajo prueba es puro (sin react-native ni MMKV), así que estos tests
 * corren sin módulos nativos. La fecha se inyecta en cada llamada en vez de
 * tocar el reloj del sistema.
 */

import {
  toDateKey,
  parseDateKey,
  addDays,
  effectiveStatus,
  calculateGlobalStreak,
  getCompletionStats,
} from '../src/services/nonNegotiablesLogic';
import type {NonNegotiableRecord, NonNegotiableStatus} from '../src/types/nonNegotiable';

let seq = 0;
const rec = (
  date: string,
  status: NonNegotiableStatus,
  nonNegotiableId = 'A',
): NonNegotiableRecord => ({
  id: `r${seq++}`,
  nonNegotiableId,
  date,
  status,
  respondedAt: status === 'pending' ? null : `${date}T20:00:00.000Z`,
});

// Fecha local a mediodía: evita que la hora influya en el día civil.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe('fechas', () => {
  it('toDateKey usa el día civil LOCAL, no UTC', () => {
    // 20:00 en UTC-5 ya es el día siguiente en UTC. Con toISOString() esto
    // devolvería el día 24 y guardaría el registro en la fecha equivocada.
    expect(toDateKey(at(2026, 8, 23, 20))).toBe('2026-08-23');
    expect(toDateKey(at(2026, 8, 23, 0))).toBe('2026-08-23');
    expect(toDateKey(at(2026, 8, 23, 23))).toBe('2026-08-23');
  });

  it('toDateKey rellena con ceros', () => {
    expect(toDateKey(at(2026, 1, 5))).toBe('2026-01-05');
  });

  it('parseDateKey es la inversa de toDateKey', () => {
    for (const key of ['2026-01-01', '2026-08-23', '2026-12-31']) {
      expect(toDateKey(parseDateKey(key))).toBe(key);
    }
  });

  it('addDays cruza el cambio de mes y de año', () => {
    expect(toDateKey(addDays(at(2026, 8, 31), 1))).toBe('2026-09-01');
    expect(toDateKey(addDays(at(2026, 1, 1), -1))).toBe('2025-12-31');
  });

  it('addDays cruza el 29 de febrero de un año bisiesto', () => {
    expect(toDateKey(addDays(at(2028, 2, 28), 1))).toBe('2028-02-29');
    expect(toDateKey(addDays(at(2028, 3, 1), -1))).toBe('2028-02-29');
  });

  it('addDays retrocede un día exacto en TODOS los días del año', () => {
    // Este es el test que caza el bug de restar 86400000 ms: en los dos días
    // de cambio de horario esa resta salta o repite una fecha. Recorriendo el
    // año entero, el caso aparece en cualquier zona con horario de verano.
    let d = at(2026, 1, 1);
    for (let i = 0; i < 365; i++) {
      const next = addDays(d, 1);
      const back = addDays(next, -1);
      expect(toDateKey(back)).toBe(toDateKey(d));
      d = next;
    }
  });
});

describe('effectiveStatus', () => {
  it('un pending de un día anterior se lee como missed', () => {
    expect(effectiveStatus(rec('2026-08-22', 'pending'), '2026-08-23')).toBe('missed');
  });

  it('un pending de HOY sigue pending', () => {
    expect(effectiveStatus(rec('2026-08-23', 'pending'), '2026-08-23')).toBe('pending');
  });

  it('los estados ya respondidos no se tocan', () => {
    expect(effectiveStatus(rec('2026-08-20', 'done'), '2026-08-23')).toBe('done');
    expect(effectiveStatus(rec('2026-08-20', 'missed'), '2026-08-23')).toBe('missed');
  });
});

describe('calculateGlobalStreak', () => {
  const hoy = at(2026, 8, 23);

  it('cuenta días consecutivos con todo cumplido', () => {
    const records = [
      rec('2026-08-23', 'done'),
      rec('2026-08-22', 'done'),
      rec('2026-08-21', 'done'),
    ];
    expect(calculateGlobalStreak(records, hoy)).toBe(3);
  });

  it('un solo missed rompe la racha (regla global)', () => {
    const records = [
      rec('2026-08-23', 'done', 'A'),
      rec('2026-08-23', 'done', 'B'),
      rec('2026-08-22', 'done', 'A'),
      rec('2026-08-22', 'missed', 'B'), // 2 de 3 no basta
      rec('2026-08-21', 'done', 'A'),
    ];
    expect(calculateGlobalStreak(records, hoy)).toBe(1);
  });

  it('un día pasado SIN registros rompe la racha', () => {
    const records = [
      rec('2026-08-23', 'done'),
      // 22 no existe: no abrió la app
      rec('2026-08-21', 'done'),
      rec('2026-08-20', 'done'),
    ];
    expect(calculateGlobalStreak(records, hoy)).toBe(1);
  });

  it('HOY incompleto NO rompe la racha: el día sigue abierto', () => {
    const records = [
      rec('2026-08-23', 'pending', 'A'),
      rec('2026-08-23', 'pending', 'B'),
      rec('2026-08-22', 'done', 'A'),
      rec('2026-08-22', 'done', 'B'),
      rec('2026-08-21', 'done', 'A'),
      rec('2026-08-21', 'done', 'B'),
    ];
    expect(calculateGlobalStreak(records, hoy)).toBe(2);
  });

  it('HOY cumplido sí suma', () => {
    const records = [rec('2026-08-23', 'done'), rec('2026-08-22', 'done')];
    expect(calculateGlobalStreak(records, hoy)).toBe(2);
  });

  it('sin registros la racha es 0', () => {
    expect(calculateGlobalStreak([], hoy)).toBe(0);
  });

  it('un no negociable creado hace 2 días no exige los días previos', () => {
    // A existe desde hace tiempo; B se creó el 22. La racha de A no se rompe
    // por los días en que B no existía.
    const records = [
      rec('2026-08-23', 'done', 'A'),
      rec('2026-08-23', 'done', 'B'),
      rec('2026-08-22', 'done', 'A'),
      rec('2026-08-22', 'done', 'B'),
      rec('2026-08-21', 'done', 'A'), // B aún no existía
      rec('2026-08-20', 'done', 'A'),
      rec('2026-08-19', 'done', 'A'),
    ];
    expect(calculateGlobalStreak(records, hoy)).toBe(5);
  });

  it('reactivar tras 90 días no penaliza el periodo inactivo', () => {
    // Durante la inactividad no se crearon registros de B, así que esos días
    // solo exigían A. No hace falta ningún campo extra en el modelo.
    const records = [
      rec('2026-08-23', 'done', 'A'),
      rec('2026-08-23', 'done', 'B'), // reactivado hoy
      rec('2026-08-22', 'done', 'A'),
      rec('2026-08-21', 'done', 'A'),
    ];
    expect(calculateGlobalStreak(records, hoy)).toBe(3);
  });

  it('creado y desactivado el mismo día: sin registro de hoy, la racha aguanta', () => {
    // El store borra el pending de hoy al desactivar, así que aquí no aparece.
    const records = [
      rec('2026-08-23', 'done', 'A'),
      rec('2026-08-22', 'done', 'A'),
    ];
    expect(calculateGlobalStreak(records, hoy)).toBe(2);
  });

  it('un pending de ayer rompe la racha al leerse como missed', () => {
    const records = [
      rec('2026-08-23', 'done'),
      rec('2026-08-22', 'pending'), // nunca respondió
      rec('2026-08-21', 'done'),
    ];
    expect(calculateGlobalStreak(records, hoy)).toBe(1);
  });

  it('la racha cruza el cambio de mes', () => {
    const records = [
      rec('2026-09-01', 'done'),
      rec('2026-08-31', 'done'),
      rec('2026-08-30', 'done'),
    ];
    expect(calculateGlobalStreak(records, at(2026, 9, 1))).toBe(3);
  });
});

describe('getCompletionStats', () => {
  const hoy = at(2026, 8, 23);

  it('con pocos días exigibles devuelve conteo bruto, sin porcentaje', () => {
    const records = [
      rec('2026-08-23', 'done'),
      rec('2026-08-22', 'done'),
      rec('2026-08-21', 'missed'),
      rec('2026-08-20', 'done'),
    ];
    const stats = getCompletionStats(records, 'A', hoy);
    expect(stats).toEqual({done: 3, total: 4, rate: null}); // 3 de 4, no "10 %"
  });

  it('el denominador son los días EXIGIBLES, no 30 fijos', () => {
    // 10 días exigibles, 8 cumplidos -> 80 %, no 8/30 = 27 %
    const records = [];
    for (let i = 0; i < 10; i++) {
      records.push(rec(toDateKey(addDays(hoy, -i)), i < 8 ? 'done' : 'missed'));
    }
    const stats = getCompletionStats(records, 'A', hoy);
    expect(stats.total).toBe(10);
    expect(stats.done).toBe(8);
    expect(stats.rate).toBe(80);
  });

  it('ignora los registros de otros no negociables', () => {
    const records = [
      rec('2026-08-23', 'done', 'A'),
      rec('2026-08-23', 'missed', 'B'),
      rec('2026-08-22', 'missed', 'B'),
    ];
    expect(getCompletionStats(records, 'A', hoy)).toEqual({done: 1, total: 1, rate: null});
  });

  it('un pending de HOY no cuenta como fallo', () => {
    const records = [rec('2026-08-23', 'pending'), rec('2026-08-22', 'done')];
    const stats = getCompletionStats(records, 'A', hoy);
    expect(stats.total).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('un pending de AYER sí cuenta como fallo', () => {
    const records = [rec('2026-08-22', 'pending'), rec('2026-08-21', 'done')];
    const stats = getCompletionStats(records, 'A', hoy);
    expect(stats.total).toBe(2);
    expect(stats.done).toBe(1);
  });

  it('descarta lo anterior a la ventana de 30 días', () => {
    const records = [
      rec(toDateKey(addDays(hoy, -29)), 'done'), // dentro (día 30)
      rec(toDateKey(addDays(hoy, -30)), 'done'), // fuera
      rec(toDateKey(addDays(hoy, -60)), 'done'), // fuera
    ];
    expect(getCompletionStats(records, 'A', hoy).total).toBe(1);
  });

  it('sin registros devuelve ceros', () => {
    expect(getCompletionStats([], 'A', hoy)).toEqual({done: 0, total: 0, rate: null});
  });
});
