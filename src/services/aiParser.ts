// src/services/aiParser.ts
// Servicio de parsing de IA - equivalente a Managers/AIRoutineParser.swift

import axios from 'axios';
import type {ParsedRoutine, RoutineEvent} from '../types';
import {EventCategory, WeekDay, WEEKDAY_CONFIG} from '../types/enums';
import {getAPIConfig, useAISettingsStore, type APIConfig} from '../stores/aiSettingsStore';
import {useRoutinesStore} from '../stores/routinesStore';
import * as keychain from '../services/keychain';

interface ParseResult {
  success: boolean;
  routines: ParsedRoutine[];
  error?: string;
}

// Typical/allowed duration ranges (minutes) per category - mirrors AIRoutineParser.swift
// so AI-suggested durations are clamped to realistic blocks instead of trusted blindly.
const CATEGORY_DURATION: Record<EventCategory, {min: number; max: number; fallback: number}> = {
  [EventCategory.gym]: {min: 60, max: 120, fallback: 60},
  [EventCategory.code]: {min: 60, max: 240, fallback: 90},
  [EventCategory.english]: {min: 30, max: 90, fallback: 45},
  [EventCategory.cooking]: {min: 15, max: 60, fallback: 30},
  [EventCategory.social]: {min: 30, max: 180, fallback: 60},
  [EventCategory.work]: {min: 180, max: 480, fallback: 240},
  [EventCategory.rest]: {min: 15, max: 60, fallback: 30},
};

const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `Eres un asistente experto en organizar rutinas personales. Tu ÚNICA función es generar un JSON válido que la app pueda procesar.

REGLAS BÁSICAS:
- Devuelve SOLO JSON válido. Sin markdown. Sin texto extra.
- Todos los campos son obligatorios. Ningún valor puede ser null o vacío.
- "dias" nunca vacío. Si no se especifican días: [2,3,4,5,6] (lunes a viernes).
- Formato hora HH:MM obligatorio (08:00 no 8:00).
- "alarma.activa" SIEMPRE true. NUNCA false.
- "nombre" es un ID único — usa el mismo nombre exacto para actualizar una rutina existente.
- Una actividad distinta = un objeto separado en el array "rutinas".
- "subcategorias" siempre un array vacío [] — se gestionan por separado en la app.

Formato exacto:
{"rutinas":[{"nombre":"string (max 50 chars)","descripcion":"string","proposito":"string","objetivo":"string","categoria":"gym|code|english|cooking|social|work|rest","dias":[1-7],"hora":"HH:MM","duracionMinutos":number,"alarma":{"activa":true,"hora":"HH:MM","dias":[1-7]},"subcategorias":[]}]}

CAMPO "duracionMinutos" (CRÍTICO):
- Representa cuánto dura realmente la actividad en minutos. NO acortes nada.
- Una misma actividad puede aparecer en MÚLTIPLES bloques si se hace en horarios distintos del día.
  Ejemplo: trabajar de 8-12 y de 14-18 = DOS rutinas: "Trabajo Mañana" (240min) y "Trabajo Tarde" (240min).
- Duraciones típicas por categoría (no acortes actividades reales por debajo de estos rangos):
  work → 180-480 min por bloque (si se divide en 2, cada uno 180-240 min)
  gym → 60-120 min
  code → 60-240 min
  english → 30-90 min
  cooking → 15-60 min (comida rápida entre actividades = 15-20 min)
  social → 30-180 min
  rest → 15-60 min
- Si el usuario dice "trabajo de 8 a 12" → duracionMinutos=240. NO pongas 60.
- Si no se especifica, usa la duración típica de esa categoría.

Días (1=Domingo 2=Lunes 3=Martes 4=Miércoles 5=Jueves 6=Viernes 7=Sábado):
"entre semana"=[2,3,4,5,6] | "fin de semana"=[1,7] | "todos los días"=[1,2,3,4,5,6,7]
"alarma.dias" normalmente coincide con "dias", salvo que el usuario pida una alarma en días distintos.

Categorías: gym=ejercicio | code=programación | english=idiomas | cooking=comida | social=ocio | work=trabajo | rest=descanso

ORGANIZACIÓN DEL DÍA:
- Las actividades NO se solapan. Usa "hora" + "duracionMinutos" para calcular cuándo termina cada una y encadenar el timeline: hora_siguiente >= hora_anterior + duracionMinutos_anterior.
- Si una actividad termina y la siguiente requiere una transición (comer, prepararse, desplazarse), créala como rutina propia (ej: "Almuerzo rápido" 15min, categoría cooking).
- Si una actividad se repite en 2 momentos del día, crea 2 rutinas con nombres distintos: "Trabajo Mañana" y "Trabajo Tarde", NO una sola de 10 horas.

EJEMPLO DE DÍA REAL BIEN ORGANIZADO:
Input: "Me levanto a las 7, trabajo de 8 a 12, como rápido y gym de 12:15 a 2, trabajo de 2 a 6, como algo, saco al perro a las 7, luego inglés y programación."
Output:
{"rutinas":[
  {"nombre":"Despertar","descripcion":"Levantarse, lavarse y desayunar para arrancar el día con energía","proposito":"Empezar el día activo e hidratado","objetivo":"Estar listo para trabajar a las 8:00","categoria":"rest","dias":[2,3,4,5,6],"hora":"07:00","duracionMinutos":60,"alarma":{"activa":true,"hora":"07:00","dias":[2,3,4,5,6]},"subcategorias":[]},
  {"nombre":"Trabajo Mañana","descripcion":"Bloque de trabajo enfocado de la mañana","proposito":"Avanzar en tareas prioritarias con mente fresca","objetivo":"Completar las tareas más importantes del día","categoria":"work","dias":[2,3,4,5,6],"hora":"08:00","duracionMinutos":240,"alarma":{"activa":true,"hora":"08:00","dias":[2,3,4,5,6]},"subcategorias":[]},
  {"nombre":"Almuerzo pre-gym","descripcion":"Comida ligera y rápida antes de ir al gimnasio","proposito":"Tener energía para entrenar sin pesadez","objetivo":"Comer en 15 minutos algo nutritivo y ligero","categoria":"cooking","dias":[2,3,4,5,6],"hora":"12:00","duracionMinutos":15,"alarma":{"activa":true,"hora":"12:00","dias":[2,3,4,5,6]},"subcategorias":[]},
  {"nombre":"Gym","descripcion":"Entrenamiento de fuerza en gimnasio","proposito":"Mejorar condición física y fuerza","objetivo":"Completar la rutina planificada con buena forma","categoria":"gym","dias":[2,3,4,5,6],"hora":"12:15","duracionMinutos":105,"alarma":{"activa":true,"hora":"12:15","dias":[2,3,4,5,6]},"subcategorias":[]},
  {"nombre":"Trabajo Tarde","descripcion":"Segundo bloque de trabajo de la tarde","proposito":"Cerrar pendientes y avanzar en proyectos","objetivo":"Terminar el día laboral con todas las tareas al día","categoria":"work","dias":[2,3,4,5,6],"hora":"14:00","duracionMinutos":240,"alarma":{"activa":true,"hora":"14:00","dias":[2,3,4,5,6]},"subcategorias":[]},
  {"nombre":"Merienda","descripcion":"Comer algo después del trabajo antes de salir","proposito":"Recuperar energía para las actividades de la noche","objetivo":"Comer algo nutritivo en 20 minutos","categoria":"cooking","dias":[2,3,4,5,6],"hora":"18:00","duracionMinutos":20,"alarma":{"activa":true,"hora":"18:00","dias":[2,3,4,5,6]},"subcategorias":[]},
  {"nombre":"Paseo con perro","descripcion":"Sacar al perro a caminar por el barrio","proposito":"Ejercicio ligero, despejar la mente y cuidar la mascota","objetivo":"Caminar mínimo 30 minutos","categoria":"social","dias":[2,3,4,5,6],"hora":"18:30","duracionMinutos":30,"alarma":{"activa":true,"hora":"18:30","dias":[2,3,4,5,6]},"subcategorias":[]},
  {"nombre":"Inglés","descripcion":"Estudio y práctica de inglés","proposito":"Mejorar fluidez y vocabulario","objetivo":"Practicar listening y speaking 90 minutos","categoria":"english","dias":[2,3,4,5,6],"hora":"19:00","duracionMinutos":90,"alarma":{"activa":true,"hora":"19:00","dias":[2,3,4,5,6]},"subcategorias":[]},
  {"nombre":"Programación","descripcion":"Sesión de código y desarrollo de proyectos personales","proposito":"Mejorar habilidades técnicas y avanzar en proyectos","objetivo":"Completar al menos una tarea o feature por sesión","categoria":"code","dias":[2,3,4,5,6],"hora":"20:30","duracionMinutos":90,"alarma":{"activa":true,"hora":"20:30","dias":[2,3,4,5,6]},"subcategorias":[]},
  {"nombre":"Descanso nocturno","descripcion":"Tiempo libre para relajarse antes de dormir","proposito":"Desconectar y preparar el cuerpo para descansar","objetivo":"Estar en cama antes de las 23:00","categoria":"rest","dias":[2,3,4,5,6],"hora":"22:00","duracionMinutos":60,"alarma":{"activa":true,"hora":"22:00","dias":[2,3,4,5,6]},"subcategorias":[]}
]}

MODO ACTUALIZAR — cuando el usuario dice "actualiza", "complementa", "mejora", "completa":
- Devuelve TODAS las rutinas existentes relevantes, no solo las mencionadas.
- Mantén "nombre", "hora", "duracionMinutos" y "dias" exactos.
- Enriquece solo "descripcion", "proposito" y "objetivo".

MODO AJUSTAR — cuando el usuario dice "ajusta", "organiza mi día", "distribuye", "horario completo", "más detallado", "llena el día":
- Devuelve TODAS las rutinas con "hora" y "duracionMinutos" reorganizados.
- Calcula: hora_siguiente >= hora_anterior + duracionMinutos_anterior + transición.
- Transiciones: 15 min dentro de casa, 30 min si hay desplazamiento.
- Si hay actividades repetidas (ej: trabajo mañana y tarde), divídelas en bloques con nombres distintos.
- Mantén nombres exactos de rutinas existentes. Solo ajusta "hora" y "duracionMinutos".`;

// Builds rich context about the user's existing routines so the AI can update/complement
// them coherently - mirrors AIRoutineParser.swift's formatExistingRoutines.
function formatExistingRoutines(events: RoutineEvent[]): string {
  if (events.length === 0) return '';

  const grouped = new Map<string, RoutineEvent[]>();
  for (const event of events) {
    const list = grouped.get(event.title) ?? [];
    list.push(event);
    grouped.set(event.title, list);
  }

  const getSubtasksByEventId = useRoutinesStore.getState().getSubtasksByEventId;

  const lines = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 20)
    .map(([title, group]) => {
      const first = group[0];
      const days = [...new Set(group.map(e => WEEKDAY_CONFIG[e.dayRaw as WeekDay]?.iOSWeekday).filter((d): d is number => !!d))].sort((a, b) => a - b);
      const alarmStr = first.alarmEnabled
        ? `alarm ${first.alarmTime} on days [${first.alarmDaysRaw}]`
        : 'no alarm';
      const tasks = getSubtasksByEventId(first.id).slice(0, 8).map(s => `'${s.title}'`).join(', ');

      let line = `- ${title} | cat=${first.categoryRaw} | days=[${days.join(',')}] | ${first.startTime}-${first.endTime} | ${alarmStr}`;
      if (first.routineDescription) line += `\n  descripcion: ${first.routineDescription.slice(0, 100)}`;
      if (first.purpose) line += `\n  proposito: ${first.purpose.slice(0, 100)}`;
      if (first.objectives) line += `\n  objetivo: ${first.objectives.slice(0, 100)}`;
      if (tasks) line += `\n  tareas: ${tasks}`;
      return line;
    });

  return lines.join('\n');
}

export async function parseRoutineFromText(
  text: string,
  existingRoutines: RoutineEvent[],
): Promise<ParseResult> {
  if (useAISettingsStore.getState().isLoading) {
    await useAISettingsStore.getState().loadSettings();
  }
  const state = useAISettingsStore.getState();
  const config = await getAPIConfig(state);

  if (!config) {
    return {success: false, routines: [], error: 'unknownProvider'};
  }
  if (!config.apiKey) {
    return {success: false, routines: [], error: 'missingAPIKey'};
  }

  try {
    const existingContext = formatExistingRoutines(existingRoutines);
    const systemPrompt = existingContext
      ? `${SYSTEM_PROMPT}\n\nRutinas existentes (mantén el MISMO nombre para actualizar):\n${existingContext}`
      : SYSTEM_PROMPT;

    const userPrompt = `Input del usuario:\n\n${text}\n\nDevuelve SOLO el JSON.`;

    const response = config.baseUrl === ANTHROPIC_BASE_URL
      ? await callAnthropicAPI(config, systemPrompt, userPrompt)
      : await callOpenAICompatibleAPI(config, systemPrompt, userPrompt);

    const routines = extractAndValidateRoutines(response);
    return {success: true, routines};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {success: false, routines: [], error: `networkError: ${message}`};
  }
}

export async function parseRoutineFromAudio(
  audioUri: string,
  existingRoutines: RoutineEvent[],
): Promise<ParseResult> {
  const openAIKey = await keychain.getOpenAIKey();
  if (!openAIKey) {
    return {success: false, routines: [], error: 'missingAPIKey'};
  }

  try {
    // Transcribe audio with Whisper (always OpenAI, regardless of the selected text provider)
    const formData = new FormData();
    formData.append('file', {uri: audioUri, type: 'audio/m4a', name: 'recording.m4a'} as unknown as Blob);
    formData.append('model', 'whisper-1');

    const transcriptionResponse = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          Authorization: `Bearer ${openAIKey}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      },
    );

    const text = transcriptionResponse.data.text;
    return parseRoutineFromText(text, existingRoutines);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {success: false, routines: [], error: `transcriptionFailed: ${message}`};
  }
}

async function callAnthropicAPI(config: APIConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await axios.post(
    config.baseUrl,
    {
      model: config.model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{role: 'user', content: userPrompt}],
    },
    {
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      timeout: 60000,
    },
  );

  return response.data.content[0].text;
}

async function callOpenAICompatibleAPI(config: APIConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  const payload: Record<string, unknown> = {
    model: config.model,
    max_tokens: 8192,
    messages: [
      {role: 'system', content: systemPrompt},
      {role: 'user', content: userPrompt},
    ],
  };
  if (config.supportsJSONMode) {
    payload.response_format = {type: 'json_object'};
  }

  const response = await axios.post(
    `${config.baseUrl}/chat/completions`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
      },
      timeout: 60000,
    },
  );

  return response.data.choices[0].message.content;
}

function extractAndValidateRoutines(rawResponse: string): ParsedRoutine[] {
  // Clean markdown wrappers
  let json = rawResponse.trim();
  if (json.startsWith('```json')) {
    json = json.slice(7);
  } else if (json.startsWith('```')) {
    json = json.slice(3);
  }
  if (json.endsWith('```')) {
    json = json.slice(0, -3);
  }
  json = json.trim();

  const parseRoutines = (raw: string): ParsedRoutine[] | null => {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.rutinas && Array.isArray(parsed.rutinas)) return parsed.rutinas;
      if (parsed.routines && Array.isArray(parsed.routines)) return parsed.routines;
      return null;
    } catch {
      return null;
    }
  };

  const routines = parseRoutines(json) ?? parseRoutines(repairTruncatedJSON(json));
  return (routines ?? []).map(validateAndFix);
}

function validateAndFix(routine: ParsedRoutine): ParsedRoutine {
  // Nombre: trim, truncate, fallback
  const trimmedName = (routine.nombre || '').trim();
  const nombre = trimmedName ? trimmedName.slice(0, 50) : 'Nueva rutina';

  // Text fields: never empty
  const descripcion = (routine.descripcion || '').trim() || 'Personal routine';
  const proposito = (routine.proposito || '').trim() || 'Improve personal habits';
  const objetivo = (routine.objetivo || '').trim() || 'Complete the planned routine';

  // Validate category
  const validCategories = Object.values(EventCategory);
  const categoria = validCategories.includes(routine.categoria as EventCategory)
    ? routine.categoria
    : EventCategory.work;

  // Days: only 1-7, dedup, sorted, default to weekdays if empty
  let dias = (routine.dias || [])
    .filter(d => typeof d === 'number' && d >= 1 && d <= 7);
  dias = [...new Set(dias)].sort((a, b) => a - b);
  if (dias.length === 0) dias = [2, 3, 4, 5, 6];

  // Time
  const hora = parseTime(routine.hora);

  // Duration: clamp to the category's realistic range
  const range = CATEGORY_DURATION[categoria as EventCategory];
  const duracionMinutos = clamp(routine.duracionMinutos || range.fallback, range.min, range.max);

  // Alarm always active - the AI must never be able to disable it by inference
  const alarmaDias = (routine.alarma?.dias || []).filter(d => d >= 1 && d <= 7);
  const alarma = {
    activa: true,
    dias: alarmaDias.length > 0 ? [...new Set(alarmaDias)].sort((a, b) => a - b) : dias,
    hora: parseTime(routine.alarma?.hora || hora),
  };

  return {
    nombre,
    descripcion,
    proposito,
    objetivo,
    categoria,
    dias,
    hora,
    duracionMinutos,
    alarma,
    subcategorias: [], // Managed separately in the routine detail view
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseTime(time: string | undefined): string {
  if (!time) return '09:00';

  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = Math.min(23, Math.max(0, parseInt(match[1], 10)));
    const minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  return '09:00';
}

// Attempts to close truncated JSON so it can be parsed - happens when max_tokens
// is hit mid-response. Mirrors AIRoutineParser.swift's repair strategy.
function repairTruncatedJSON(json: string): string {
  const cut = findLastValidRoutineCut(json);
  if (cut !== null) {
    let result = json.slice(0, cut).trim();
    if (result.endsWith(',')) result = result.slice(0, -1);
    return `${result}\n  ]\n}`;
  }
  return closeOpenBrackets(json);
}

// Finds the index just after the last complete routine object (depth 1, i.e. an
// object directly inside the top-level "rutinas" array) before the truncation point.
function findLastValidRoutineCut(json: string): number | null {
  let depth = 0;
  let inString = false;
  let prevChar = '';
  let lastCompleteObjectEnd: number | null = null;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (char === '"' && prevChar !== '\\') inString = !inString;
    if (!inString) {
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 1) lastCompleteObjectEnd = i + 1;
      }
    }
    prevChar = char;
  }

  return lastCompleteObjectEnd;
}

// Closes unclosed `{` and `[` brackets at the end of truncated JSON.
function closeOpenBrackets(json: string): string {
  const stack: string[] = [];
  let inString = false;
  let prevChar = '';

  for (const char of json) {
    if (char === '"' && prevChar !== '\\') inString = !inString;
    if (!inString) {
      if (char === '{' || char === '[') stack.push(char);
      else if (char === '}' || char === ']') stack.pop();
    }
    prevChar = char;
  }

  let result = json;
  const lastBrace = Math.max(result.lastIndexOf('}'), result.lastIndexOf(']'));
  if (lastBrace !== -1) result = result.slice(0, lastBrace + 1);

  for (let i = stack.length - 1; i >= 0; i--) {
    result += stack[i] === '{' ? '}' : ']';
  }
  return result;
}
