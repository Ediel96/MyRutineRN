// src/screens/AISettingsScreen.tsx
import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAISettingsStore} from '../stores/aiSettingsStore';
import * as keychain from '../services/keychain';
import {ScreenContainer, Card, TextField, Button, Badge} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';
import type {CustomProvider} from '../types';

type Props = RootStackScreenProps<'AISettings'>;

interface CustomProviderErrors {
  name?: string;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}

const emptyForm = {name: '', baseUrl: '', model: '', apiKey: ''};

// Known OpenAI-compatible providers - tapping one prefills name/baseUrl/model so the
// user only has to paste their API key.
const PRESET_PROVIDERS = [
  {name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile'},
  {name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini'},
  {name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat'},
  {name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'},
  {name: 'Ollama (local)', baseUrl: 'http://localhost:11434/v1', model: 'llama3'},
];

export default function AISettingsScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {
    selectedProvider, openAIKey, anthropicKey, customProviders,
    loadSettings, setSelectedProvider, setOpenAIKey, setAnthropicKey,
    addCustomProvider, updateCustomProvider, deleteCustomProvider,
  } = useAISettingsStore();
  const [openaiInput, setOpenaiInput] = useState('');
  const [anthropicInput, setAnthropicInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<CustomProviderErrors>({});
  const [configuredCustomIds, setConfiguredCustomIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadSettings(); }, []);

  const refreshConfiguredCustomIds = useCallback(async (providers: CustomProvider[]) => {
    const configured = new Set<string>();
    await Promise.all(providers.map(async p => {
      const key = await keychain.getCustomProviderKey(p.id);
      if (key) configured.add(p.id);
    }));
    setConfiguredCustomIds(configured);
  }, []);

  useEffect(() => { refreshConfiguredCustomIds(customProviders); }, [customProviders, refreshConfiguredCustomIds]);

  const handleSaveOpenAI = () => { setOpenAIKey(openaiInput); setOpenaiInput(''); };
  const handleSaveAnthropic = () => { setAnthropicKey(anthropicInput); setAnthropicInput(''); };

  const startEdit = (provider: CustomProvider) => {
    setEditingId(provider.id);
    setForm({name: provider.name, baseUrl: provider.baseUrl, model: provider.model, apiKey: ''});
    setFormErrors({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleDelete = (id: string) => {
    deleteCustomProvider(id);
    if (selectedProvider === `custom:${id}`) setSelectedProvider('builtin:anthropic');
    if (editingId === id) cancelEdit();
  };

  const validateForm = (): boolean => {
    const errors: CustomProviderErrors = {};
    const name = form.name.trim();
    const baseUrl = form.baseUrl.trim();
    const model = form.model.trim();
    const apiKey = form.apiKey.trim();

    if (!name) errors.name = t('ai_settings.error_required');
    if (!baseUrl) errors.baseUrl = t('ai_settings.error_required');
    else if (!/^https?:\/\/.+/i.test(baseUrl)) errors.baseUrl = t('ai_settings.error_invalid_url');
    if (!model) errors.model = t('ai_settings.error_required');
    if (!editingId && !apiKey) errors.apiKey = t('ai_settings.error_required');

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const applyPreset = (preset: {name: string; baseUrl: string; model: string}) => {
    setForm(f => ({...f, name: preset.name, baseUrl: preset.baseUrl, model: preset.model}));
    setFormErrors({});
  };

  const handleSaveCustomProvider = async () => {
    if (!validateForm()) return;

    const name = form.name.trim();
    const baseUrl = form.baseUrl.trim();
    const model = form.model.trim();
    const apiKey = form.apiKey.trim();

    if (editingId) {
      await updateCustomProvider(editingId, {name, baseUrl, model}, apiKey || undefined);
    } else {
      const id = `custom_${Date.now()}`;
      await addCustomProvider({id, name, baseUrl, model, apiKey: ''}, apiKey);
    }
    cancelEdit();
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('ai_settings.provider')}</Text>
          {[
            {id: 'builtin:anthropic', label: t('ai_settings.anthropic'), emoji: '🤖'},
            {id: 'builtin:openai', label: t('ai_settings.openai'), emoji: '🔮'},
          ].map(p => (
            <TouchableOpacity key={p.id} style={[styles.providerOption, selectedProvider === p.id && styles.providerOptionActive]} onPress={() => setSelectedProvider(p.id)}>
              <Text style={styles.providerEmoji}>{p.emoji}</Text>
              <Text style={styles.providerLabel}>{p.label}</Text>
              {selectedProvider === p.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}

          {customProviders.map(p => {
            const active = selectedProvider === `custom:${p.id}`;
            const hasKey = configuredCustomIds.has(p.id);
            return (
              <View key={p.id} style={[styles.providerOption, active && styles.providerOptionActive, styles.customProviderOption]}>
                <TouchableOpacity style={styles.customProviderMain} onPress={() => setSelectedProvider(`custom:${p.id}`)}>
                  <Text style={styles.providerEmoji}>🧩</Text>
                  <View style={styles.customProviderInfo}>
                    <Text style={styles.providerLabel}>{p.name}</Text>
                    {!hasKey && <Badge label={t('ai_settings.no_api_key')} color={theme.colors.warning} style={styles.noKeyBadge} />}
                  </View>
                  {active && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <View style={styles.customProviderActions}>
                  <TouchableOpacity onPress={() => startEdit(p)} hitSlop={theme.hitSlop}>
                    <Text style={styles.actionIcon}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(p.id)} hitSlop={theme.hitSlop}>
                    <Text style={styles.actionIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>API Keys</Text>
          <View style={styles.field}>
            <TextField label="OpenAI Key (for Whisper)" value={openaiInput} onChangeText={setOpenaiInput} placeholder="sk-..." secureTextEntry />
            <View style={styles.fieldFooter}>
              <Button title="Save" onPress={handleSaveOpenAI} variant="secondary" fullWidth={false} style={styles.saveButton} />
              {openAIKey && <Badge label="✓ Saved" color={theme.colors.success} />}
            </View>
          </View>
          <View style={styles.field}>
            <TextField label="Anthropic Key (for Claude)" value={anthropicInput} onChangeText={setAnthropicInput} placeholder="sk-ant-..." secureTextEntry />
            <View style={styles.fieldFooter}>
              <Button title="Save" onPress={handleSaveAnthropic} variant="secondary" fullWidth={false} style={styles.saveButton} />
              {anthropicKey && <Badge label="✓ Saved" color={theme.colors.success} />}
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>{t('ai_settings.custom_providers')}</Text>
          <Text style={styles.presetsLabel}>{t('ai_settings.examples')}</Text>
          <View style={styles.presetRow}>
            {PRESET_PROVIDERS.map(preset => (
              <TouchableOpacity key={preset.name} style={styles.presetChip} onPress={() => applyPreset(preset)}>
                <Text style={styles.presetChipText}>{preset.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.field}>
            <TextField
              label={t('ai_settings.provider_name')}
              value={form.name}
              onChangeText={v => setForm(f => ({...f, name: v}))}
              error={formErrors.name}
              placeholder="My LLM"
            />
          </View>
          <View style={styles.field}>
            <TextField
              label={t('ai_settings.base_url')}
              value={form.baseUrl}
              onChangeText={v => setForm(f => ({...f, baseUrl: v}))}
              error={formErrors.baseUrl}
              placeholder="https://api.example.com/v1"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.field}>
            <TextField
              label={t('ai_settings.model')}
              value={form.model}
              onChangeText={v => setForm(f => ({...f, model: v}))}
              error={formErrors.model}
              placeholder="gpt-4o-mini"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.field}>
            <TextField
              label={t('ai_settings.api_key')}
              value={form.apiKey}
              onChangeText={v => setForm(f => ({...f, apiKey: v}))}
              error={formErrors.apiKey}
              placeholder={editingId ? t('ai_settings.enter_api_key') : 'sk-...'}
              secureTextEntry
            />
          </View>
          <View style={styles.formActions}>
            <Button
              title={editingId ? t('ai_settings.save') : t('ai_settings.add_provider')}
              onPress={handleSaveCustomProvider}
              variant="secondary"
              fullWidth={false}
              style={styles.saveButton}
            />
            {editingId && (
              <Button title={t('voice.discard')} onPress={cancelEdit} variant="tertiary" fullWidth={false} />
            )}
          </View>
        </Card>

        <Card style={styles.infoBox} variant="surfaceAlt">
          <Text style={styles.infoTitle}>ℹ️ Note</Text>
          <Text style={styles.infoText}>API keys are stored securely in the device keychain and never sent to our servers.</Text>
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {paddingVertical: spacing.lg, paddingBottom: spacing.xxl},
    section: {marginHorizontal: spacing.lg, marginBottom: spacing.md},
    sectionTitle: {fontSize: typography.xs + 1, fontWeight: typography.semibold, color: colors.textSecondary, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5},
    providerOption: {flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, marginBottom: spacing.sm, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border},
    providerOptionActive: {backgroundColor: colors.primary + '1f', borderColor: colors.primary},
    providerEmoji: {fontSize: 24, marginRight: spacing.md},
    providerLabel: {flex: 1, fontSize: typography.lg, color: colors.textPrimary},
    checkmark: {color: colors.primary, fontSize: typography.xl, fontWeight: typography.bold},
    customProviderOption: {paddingVertical: spacing.sm},
    customProviderMain: {flex: 1, flexDirection: 'row', alignItems: 'center'},
    customProviderInfo: {flex: 1},
    noKeyBadge: {marginTop: spacing.xxs},
    customProviderActions: {flexDirection: 'row', gap: spacing.md, marginLeft: spacing.sm},
    actionIcon: {fontSize: typography.lg},
    presetsLabel: {fontSize: typography.sm, color: colors.textTertiary, marginBottom: spacing.sm},
    presetRow: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg},
    presetChip: {paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border},
    presetChipText: {fontSize: typography.sm, color: colors.textSecondary, fontWeight: typography.medium},
    field: {marginBottom: spacing.lg},
    fieldFooter: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm},
    formActions: {flexDirection: 'row', alignItems: 'center', gap: spacing.md},
    saveButton: {paddingHorizontal: spacing.xl},
    infoBox: {marginHorizontal: spacing.lg},
    infoTitle: {fontWeight: typography.semibold, marginBottom: spacing.xs, color: colors.textPrimary},
    infoText: {fontSize: typography.md, color: colors.textSecondary},
  });
