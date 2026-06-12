// src/services/aiParser.ts
// Servicio de parsing de IA - equivalente a Managers/AIRoutineParser.swift

import axios from 'axios';
import type {ParsedRoutine, RoutineEvent} from '../types';
import {EventCategory, WeekDay} from '../types/enums';
import {getAPIConfig} from '../stores/aiSettingsStore';
import type {AISettingsState} from '../stores/aiSettingsStore';
import * as keychain from '../services/keychain';

interface ParseResult {
  success: boolean;
  routines: ParsedRoutine[];
  error?: string;
}

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
- nombre max 50 characters`;

export async function parseRoutineFromText(
  text: string,
  existingRoutines: RoutineEvent[],
): Promise<ParseResult> {
  const state = {
    selectedProvider: 'builtin:anthropic',
    openAIKey: await keychain.getOpenAIKey(),
    anthropicKey: await keychain.getAnthropicKey(),
    customProviders: [],
  } as AISettingsState;

  const config = getAPIConfig(state);
  if (!config) {
    return {success: false, routines: [], error: 'No API configuration found'};
  }

  if (!state.openAIKey) {
    return {success: false, routines: [], error: 'missingAPIKey'};
  }

  try {
    const context = existingRoutines.length > 0
      ? `\nExisting routines: ${existingRoutines.map(r => r.title).join(', ')}`
      : '';

    const userPrompt = `${text}${context}\n\nCreate routines based on the user's request.`;

    let response: string;

    if (state.selectedProvider === 'builtin:anthropic') {
      response = await callAnthropicAPI(config, userPrompt);
    } else {
      response = await callOpenAICompatibleAPI(config, userPrompt);
    }

    const routines = extractAndValidateRoutines(response);
    return {success: true, routines};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {success: false, routines: [], error: message};
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
    // Transcribe audio with Whisper
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
    const message = error instanceof Error ? error.message : 'Transcription failed';
    return {success: false, routines: [], error: `transcriptionFailed: ${message}`};
  }
}

async function callAnthropicAPI(config: ReturnType<typeof getAPIConfig>, userPrompt: string): Promise<string> {
  const response = await axios.post(
    config.baseUrl,
    {
      model: config.model,
      max_tokens: 4096,
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

async function callOpenAICompatibleAPI(config: ReturnType<typeof getAPIConfig>, userPrompt: string): Promise<string> {
  const response = await axios.post(
    `${config.baseUrl}/chat/completions`,
    {
      model: config.model,
      messages: [
        {role: 'system', content: SYSTEM_PROMPT},
        {role: 'user', content: userPrompt},
      ],
      response_format: {type: 'json_object'},
    },
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

  try {
    const parsed = JSON.parse(json);
    let routines: ParsedRoutine[] = [];

    if (Array.isArray(parsed)) {
      routines = parsed;
    } else if (parsed.rutinas && Array.isArray(parsed.rutinas)) {
      routines = parsed.rutinas;
    } else if (parsed.routines && Array.isArray(parsed.routines)) {
      routines = parsed.routines;
    }

    return routines.map(validateAndFix);
  } catch {
    // Try to repair truncated JSON
    const repaired = repairTruncatedJSON(json);
    try {
      const parsed = JSON.parse(repaired);
      if (parsed.rutinas) {
        return (parsed.rutinas as ParsedRoutine[]).map(validateAndFix);
      }
    } catch {
      // Give up
    }
    return [];
  }
}

function validateAndFix(routine: ParsedRoutine): ParsedRoutine {
  // Truncate name
  const nombre = routine.nombre?.slice(0, 50) || 'Nueva rutina';

  // Ensure non-empty fields
  const descripcion = routine.descripcion || '';
  const proposito = routine.proposito || '';
  const objetivo = routine.objetivo || '';

  // Validate category
  const validCategories = Object.values(EventCategory);
  const categoria = validCategories.includes(routine.categoria as EventCategory)
    ? routine.categoria
    : EventCategory.work;

  // Parse and validate days
  let dias = (routine.dias || [])
    .filter(d => typeof d === 'number' && d >= 1 && d <= 7)
    .map(d => d as number);

  // Remove duplicates and sort
  dias = [...new Set(dias)].sort();

  // Default to weekdays if empty
  if (dias.length === 0) {
    dias = [2, 3, 4, 5, 6];
  }

  // Parse and validate time
  const hora = parseTime(routine.hora);

  // Force alarm active
  const alarma = {
    activa: true,
    dias: routine.alarma?.dias?.filter(d => d >= 1 && d <= 7) || dias,
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
    duracionMinutos: routine.duracionMinutos || 60,
    alarma,
    subcategorias: [],
  };
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

function repairTruncatedJSON(json: string): string {
  // Find the last complete routine object
  const lastCompleteObject = findLastValidRoutineObject(json);
  if (!lastCompleteObject) return json;

  // Try to close any open brackets
  let result = json;
  const openBraces = (json.match(/\{/g) || []).length;
  const closeBraces = (json.match(/\}/g) || []).length;
  const openBrackets = (json.match(/\[/g) || []).length;
  const closeBrackets = (json.match(/\]/g) || []).length;

  for (let i = 0; i < openBraces - closeBraces; i++) {
    result += '}';
  }
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    result += ']';
  }

  return result;
}

function findLastValidRoutineObject(json: string): string | null {
  // Look for the last complete routine object pattern
  const pattern = /"nombre"\s*:\s*"[^"]*"[^}]*\}/g;
  const matches = json.match(pattern);
  if (matches && matches.length > 0) {
    return matches[matches.length - 1];
  }
  return null;
}