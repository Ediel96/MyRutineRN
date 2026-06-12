// src/stores/aiSettingsStore.ts
// Store de configuración de IA - equivalente a Managers/AISettings.swift

import {create} from 'zustand';
import type {CustomProvider} from '../types';
import * as storage from '../services/storage';
import * as keychain from '../services/keychain';

interface AISettingsState {
  selectedProvider: string;
  customProviders: CustomProvider[];
  openAIKey: string;
  anthropicKey: string;
  isLoading: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  setSelectedProvider: (provider: string) => Promise<void>;
  setOpenAIKey: (key: string) => Promise<void>;
  setAnthropicKey: (key: string) => Promise<void>;
  addCustomProvider: (provider: CustomProvider, apiKey: string) => Promise<void>;
  updateCustomProvider: (id: string, updates: Partial<CustomProvider>, apiKey?: string) => Promise<void>;
  deleteCustomProvider: (id: string) => Promise<void>;
  hasRequiredKeys: () => boolean;
}

export const useAISettingsStore = create<AISettingsState>((set, get) => ({
  selectedProvider: 'builtin:anthropic',
  customProviders: [],
  openAIKey: '',
  anthropicKey: '',
  isLoading: true,

  loadSettings: async () => {
    const selectedProvider = storage.getSelectedProvider();
    const customProvidersJson = storage.getCustomProviders();

    let customProviders: CustomProvider[] = [];
    try {
      customProviders = JSON.parse(customProvidersJson);
    } catch {
      customProviders = [];
    }

    const openAIKey = await keychain.getOpenAIKey();
    const anthropicKey = await keychain.getAnthropicKey();

    set({
      selectedProvider,
      customProviders,
      openAIKey,
      anthropicKey,
      isLoading: false,
    });
  },

  setSelectedProvider: async (provider) => {
    storage.setSelectedProvider(provider);
    set({selectedProvider: provider});
  },

  setOpenAIKey: async (key) => {
    await keychain.setOpenAIKey(key);
    set({openAIKey: key});
  },

  setAnthropicKey: async (key) => {
    await keychain.setAnthropicKey(key);
    set({anthropicKey: key});
  },

  addCustomProvider: async (provider, apiKey) => {
    await keychain.setCustomProviderKey(provider.id, apiKey);
    const current = get().customProviders;
    const updated = [...current, provider];
    storage.setCustomProviders(JSON.stringify(updated));
    set({customProviders: updated});
  },

  updateCustomProvider: async (id, updates, apiKey) => {
    const current = get().customProviders;
    const updated = current.map(p => (p.id === id ? {...p, ...updates} : p));
    storage.setCustomProviders(JSON.stringify(updated));
    if (apiKey) {
      await keychain.setCustomProviderKey(id, apiKey);
    }
    set({customProviders: updated});
  },

  deleteCustomProvider: async (id) => {
    await keychain.deleteCustomProviderKey(id);
    const current = get().customProviders;
    const updated = current.filter(p => p.id !== id);
    storage.setCustomProviders(JSON.stringify(updated));
    set({customProviders: updated});
  },

  hasRequiredKeys: () => {
    const state = get();
    const selected = state.selectedProvider;

    // Always need OpenAI key for Whisper
    if (!state.openAIKey) return false;

    // For Anthropic, need its key too
    if (selected === 'builtin:anthropic' && !state.anthropicKey) return false;

    // For OpenAI, we already have the key above
    if (selected === 'builtin:openai') return true;

    // For custom, check the specific provider
    if (selected.startsWith('custom:')) {
      const customId = selected.replace('custom:', '');
      // This is a simplified check - in real implementation we'd need to verify
      return state.customProviders.some(p => p.id === customId);
    }

    return true;
  },
}));

// API configuration helpers
export interface APIConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  supportsJSONMode: boolean;
}

export function getAPIConfig(state: AISettingsState): APIConfig | null {
  const {selectedProvider, openAIKey, anthropicKey, customProviders} = state;

  if (selectedProvider === 'builtin:anthropic') {
    return {
      baseUrl: 'https://api.anthropic.com/v1/messages',
      model: 'claude-sonnet-4-20250514',
      apiKey: anthropicKey,
      supportsJSONMode: false,
    };
  }

  if (selectedProvider === 'builtin:openai') {
    return {
      baseUrl: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      apiKey: openAIKey,
      supportsJSONMode: true,
    };
  }

  if (selectedProvider.startsWith('custom:')) {
    const customId = selectedProvider.replace('custom:', '');
    const provider = customProviders.find(p => p.id === customId);
    if (provider) {
      return {
        baseUrl: provider.baseUrl,
        model: provider.model,
        apiKey: '', // Will be fetched from keychain
        supportsJSONMode: true,
      };
    }
  }

  return null;
}