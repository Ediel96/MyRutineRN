// src/screens/AISettingsScreen.tsx
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAISettingsStore} from '../stores/aiSettingsStore';
import {ScreenContainer, Card, TextField, Button, Badge} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';

type Props = RootStackScreenProps<'AISettings'>;

export default function AISettingsScreen() {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {selectedProvider, openAIKey, anthropicKey, loadSettings, setSelectedProvider, setOpenAIKey, setAnthropicKey} = useAISettingsStore();
  const [openaiInput, setOpenaiInput] = useState('');
  const [anthropicInput, setAnthropicInput] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const handleSaveOpenAI = () => { setOpenAIKey(openaiInput); setOpenaiInput(''); };
  const handleSaveAnthropic = () => { setAnthropicKey(anthropicInput); setAnthropicInput(''); };

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
    field: {marginBottom: spacing.lg},
    fieldFooter: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm},
    saveButton: {paddingHorizontal: spacing.xl},
    infoBox: {marginHorizontal: spacing.lg},
    infoTitle: {fontWeight: typography.semibold, marginBottom: spacing.xs, color: colors.textPrimary},
    infoText: {fontSize: typography.md, color: colors.textSecondary},
  });
