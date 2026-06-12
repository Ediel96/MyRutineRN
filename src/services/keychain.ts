// src/services/keychain.ts
// Servicio de almacenamiento seguro de API keys - equivalente a Keychain en iOS

import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'com.myroutine.app';

export async function setOpenAIKey(key: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword('openai_key', key, {service: `${SERVICE_NAME}.openai`});
    return true;
  } catch {
    return false;
  }
}

export async function getOpenAIKey(): Promise<string> {
  try {
    const result = await Keychain.getGenericPassword({service: `${SERVICE_NAME}.openai`});
    if (result) return result.password;
    return '';
  } catch {
    return '';
  }
}

export async function setAnthropicKey(key: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword('anthropic_key', key, {service: `${SERVICE_NAME}.anthropic`});
    return true;
  } catch {
    return false;
  }
}

export async function getAnthropicKey(): Promise<string> {
  try {
    const result = await Keychain.getGenericPassword({service: `${SERVICE_NAME}.anthropic`});
    if (result) return result.password;
    return '';
  } catch {
    return '';
  }
}

export async function setCustomProviderKey(providerId: string, key: string): Promise<boolean> {
  try {
    await Keychain.setGenericPassword(`custom_key_${providerId}`, key, {
      service: `${SERVICE_NAME}.custom.${providerId}`,
    });
    return true;
  } catch {
    return false;
  }
}

export async function getCustomProviderKey(providerId: string): Promise<string> {
  try {
    const result = await Keychain.getGenericPassword({
      service: `${SERVICE_NAME}.custom.${providerId}`,
    });
    if (result) return result.password;
    return '';
  } catch {
    return '';
  }
}

export async function deleteCustomProviderKey(providerId: string): Promise<boolean> {
  try {
    await Keychain.resetGenericPassword({service: `${SERVICE_NAME}.custom.${providerId}`});
    return true;
  } catch {
    return false;
  }
}

export async function clearAllKeys(): Promise<void> {
  await Keychain.resetGenericPassword({service: `${SERVICE_NAME}.openai`});
  await Keychain.resetGenericPassword({service: `${SERVICE_NAME}.anthropic`});
}