// src/screens/AISettingsScreen.tsx
import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAISettingsStore} from '../stores/aiSettingsStore';
import {colors, spacing, borderRadius} from '../theme/AppTheme';
import type {RootStackScreenProps} from '../navigation/types';

type Props = RootStackScreenProps<'AISettings'>;

export default function AISettingsScreen() {
  const {t} = useTranslation();
  const {selectedProvider, openAIKey, anthropicKey, loadSettings, setSelectedProvider, setOpenAIKey, setAnthropicKey} = useAISettingsStore();
  const [openaiInput, setOpenaiInput] = useState('');
  const [anthropicInput, setAnthropicInput] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const handleSaveOpenAI = () => { setOpenAIKey(openaiInput); setOpenaiInput(''); };
  const handleSaveAnthropic = () => { setAnthropicKey(anthropicInput); setAnthropicInput(''); };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Keys</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>OpenAI Key (for Whisper)</Text>
            <TextInput style={styles.input} value={openaiInput} onChangeText={setOpenaiInput} placeholder="sk-..." secureTextEntry />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveOpenAI}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
            {openAIKey && <Text style={styles.savedIndicator}>✓ Saved</Text>}
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Anthropic Key (for Claude)</Text>
            <TextInput style={styles.input} value={anthropicInput} onChangeText={setAnthropicInput} placeholder="sk-ant-..." secureTextEntry />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveAnthropic}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
            {anthropicKey && <Text style={styles.savedIndicator}>✓ Saved</Text>}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Note</Text>
          <Text style={styles.infoText}>API keys are stored securely in the device keychain and never sent to our servers.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  scrollView: {flex: 1},
  section: {backgroundColor: colors.white, marginBottom: spacing.md, padding: spacing.lg},
  sectionTitle: {fontSize: 14, fontWeight: '600', color: colors.gray500, marginBottom: spacing.md, textTransform: 'uppercase'},
  providerOption: {flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.sm, backgroundColor: colors.gray50},
  providerOptionActive: {backgroundColor: colors.primary + '15', borderWidth: 1, borderColor: colors.primary},
  providerEmoji: {fontSize: 24, marginRight: spacing.md},
  providerLabel: {flex: 1, fontSize: 16},
  checkmark: {color: colors.primary, fontSize: 18},
  field: {marginBottom: spacing.lg},
  fieldLabel: {fontSize: 14, fontWeight: '600', color: colors.gray600, marginBottom: spacing.sm},
  input: {borderWidth: 1, borderColor: colors.gray300, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 14},
  saveButton: {backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.sm},
  saveText: {color: colors.white, fontWeight: '600'},
  savedIndicator: {color: colors.success, fontSize: 12, marginTop: spacing.xs},
  infoBox: {backgroundColor: colors.info + '15', margin: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg},
  infoTitle: {fontWeight: '600', marginBottom: spacing.xs},
  infoText: {fontSize: 14, color: colors.gray600},
});