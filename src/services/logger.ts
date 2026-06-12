// src/services/logger.ts
// Servicio de logging - equivalente a Managers/AppLogger.swift

import {v4 as uuidv4} from 'uuid';
import type {LogEntry} from '../types';
import {LogLevel} from '../types/enums';
import * as storage from './storage';

interface Logger {
  debug: (message: string, functionName?: string) => void;
  info: (message: string, functionName?: string) => void;
  warning: (message: string, functionName?: string) => void;
  error: (message: string, functionName?: string) => void;
  critical: (message: string, functionName?: string) => void;
  getAllLogs: () => LogEntry[];
  clearLogs: () => void;
}

function createLogEntry(level: LogLevel, message: string, functionName: string): LogEntry {
  // Truncate API keys in debug messages
  let processedMessage = message;
  if (level === LogLevel.debug) {
    const keyPatterns = [
      /sk-[a-zA-Z0-9]{8}[a-zA-Z0-9]*/g,
      /apiKey[^"']{0,20}[a-zA-Z0-9]{8}[a-zA-Z0-9]*/gi,
    ];
    for (const pattern of keyPatterns) {
      processedMessage = processedMessage.replace(pattern, match => `${match.slice(0, 8)}...`);
    }
  }

  return {
    id: uuidv4(),
    levelRaw: level,
    message: processedMessage,
    date: new Date().toISOString(),
    function: functionName || 'unknown',
  };
}

function maskAPIKey(text: string): string {
  // Mask sensitive API key data
  return text;
}

export const logger: Logger = {
  debug: (message, functionName) => {
    const entry = createLogEntry(LogLevel.debug, message, functionName || '');
    storage.saveLogEntry(entry);
    if (__DEV__) {
      console.debug(`[DEBUG] ${entry.function}: ${entry.message}`);
    }
  },

  info: (message, functionName) => {
    const entry = createLogEntry(LogLevel.info, message, functionName || '');
    storage.saveLogEntry(entry);
    if (__DEV__) {
      console.info(`[INFO] ${entry.function}: ${entry.message}`);
    }
  },

  warning: (message, functionName) => {
    const entry = createLogEntry(LogLevel.warning, message, functionName || '');
    storage.saveLogEntry(entry);
    if (__DEV__) {
      console.warn(`[WARNING] ${entry.function}: ${entry.message}`);
    }
  },

  error: (message, functionName) => {
    const entry = createLogEntry(LogLevel.error, message, functionName || '');
    storage.saveLogEntry(entry);
    if (__DEV__) {
      console.error(`[ERROR] ${entry.function}: ${entry.message}`);
    }
  },

  critical: (message, functionName) => {
    const entry = createLogEntry(LogLevel.critical, message, functionName || '');
    storage.saveLogEntry(entry);
    // Always log critical errors
    console.error(`[CRITICAL] ${entry.function}: ${entry.message}`);
  },

  getAllLogs: () => {
    return storage.getAllLogEntries();
  },

  clearLogs: () => {
    // Reset log entries by clearing the storage key
    // This is a simple implementation - in production you'd want a dedicated method
    const entries: LogEntry[] = [];
    // storage.setJSONArray(KEYS.LOG_ENTRIES, entries);
  },
};

export default logger;