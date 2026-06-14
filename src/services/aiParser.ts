// src/services/aiParser.ts
// Servicio de parsing de IA - equivalente a Managers/AIRoutineParser.swift

import axios from 'axios';
import type {ParsedRoutine, RoutineEvent} from '../types';
import {EventCategory} from '../types/enums';
import {getAPIConfig, useAISettingsStore, type APIConfig} from '../stores/aiSettingsStore';
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

const SYSTEM_PROMPT = `You are a routine planner assistant. Generate JSON array of routines based on user input.

Format required:
{
  "rutinas": [
    {
      "nombre": "string (max 50 chars)",
      "descripcion": "string",
      "proposito": "string",
      "objetivo": "string",
      "categoria": "gym|code|english|cooking|social|work|rest",
      "dias": [1-7] (1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat),
      "hora": "HH:MM",
      "duracionMinutos": number,
      "alarma": {
        "activa": true,
        "dias": [1-7],
        "hora": "HH:MM"
      },
      "subcategorias": []
    }
  ]
}

Rules:
- Return ONLY valid JSON, no markdown or extra text
- alarma.activa is always true
- dias never empty (default: [2,3,4,5,6] for weekdays)
- Categories: gym, code, english, cooking, social, work, rest
- nombre max 50 characters
- Activities don't overlap: use hora + duracionMinutos to chain the day's timeline
- If an activity repeats at different times, create separate routines (e.g. "Work Morning" / "Work Afternoon")

Typical duracionMinutos ranges per category (don't shrink real activities below these):
- work: 180-480 (full work block, split into multiple if it spans the whole day)
- gym: 60-120
- code: 60-240
- english: 30-90
- cooking: 15-60 (quick meals between activities = 15-20)
- social: 30-180
- rest: 15-60`;

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
    const context = existingRoutines.length > 0
      ? `\nExisting routines: ${existingRoutines.map(r => r.title).join(', ')}`
      : '';

    const userPrompt = `${text}${context}\n\nCreate routines based on the user's request.`;

    const response = config.baseUrl === ANTHROPIC_BASE_URL
      ? await callAnthropicAPI(config, userPrompt)
      : await callOpenAICompatibleAPI(config, userPrompt);

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

async function callAnthropicAPI(config: APIConfig, userPrompt: string): Promise<string> {
  const response = await axios.post(
    config.baseUrl,
    {
      model: config.model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
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

async function callOpenAICompatibleAPI(config: APIConfig, userPrompt: string): Promise<string> {
  const payload: Record<string, unknown> = {
    model: config.model,
    max_tokens: 8192,
    messages: [
      {role: 'system', content: SYSTEM_PROMPT},
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
