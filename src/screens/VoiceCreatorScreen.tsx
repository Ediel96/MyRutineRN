// src/screens/VoiceCreatorScreen.tsx
import React, {useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {parseRoutineFromText} from '../services/aiParser';
import {colors, spacing, borderRadius} from '../theme/AppTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {CreatorStage} from '../types/enums';
import type {ParsedRoutine} from '../types/models';

type Props = RootStackScreenProps<'VoiceCreator'>;

export default function VoiceCreatorScreen() {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const {addEvent, events} = useRoutinesStore();
  const [stage, setStage] = useState<CreatorStage>(CreatorStage.idle);
  const [mode, setMode] = useState<'voice' | 'text'>('text');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [parsedRoutines, setParsedRoutines] = useState<ParsedRoutine[]>([]);

  const handleTextSubmit = async () => {
    if (!text.trim()) return;
    setStage(CreatorStage.processing);
    setError('');
    const result = await parseRoutineFromText(text, events);
    if (result.success) {
      setParsedRoutines(result.routines);
      setStage(CreatorStage.preview);
    } else {
      setError(result.error || 'Unknown error');
      setStage(CreatorStage.error);
    }
  };

  const handleSaveAll = () => {
    parsedRoutines.forEach(routine => {
      addEvent({
        title: routine.nombre, routineDescription: routine.descripcion, purpose: routine.proposito, objectives: routine.objetivo,
        dayRaw: 'monday', startTime: routine.hora, endTime: '10:00', categoryRaw: routine.categoria,
        notes: '', alarmEnabled: routine.alarma.activa, alarmTime: routine.alarma.hora, alarmDaysRaw: routine.alarma.dias.join(','),
        notifyMinutesBefore: 0, googleSynced: false,
      });
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.closeButton}>✕</Text></TouchableOpacity>
        <Text style={styles.title}>{t('voice.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {stage === CreatorStage.idle && (
        <View style={styles.content}>
          <View style={styles.modeSelector}>
            <TouchableOpacity style={[styles.modeButton, mode === 'text' && styles.modeButtonActive]} onPress={() => setMode('text')}>
              <Text style={styles.modeEmoji}>💬</Text><Text>{t('voice.text_mode')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeButton, mode === 'voice' && styles.modeButtonActive]} onPress={() => setMode('voice')}>
              <Text style={styles.modeEmoji}>🎤</Text><Text>{t('voice.voice_mode')}</Text>
            </TouchableOpacity>
          </View>
          {mode === 'text' ? (
            <View style={styles.inputContainer}>
              <TextInput style={styles.textInput} value={text} onChangeText={setText} placeholder="Describe your routine... (e.g., 'I want to work out every morning at 7am')" multiline placeholderTextColor={colors.gray400} />
              <TouchableOpacity style={styles.submitButton} onPress={handleTextSubmit}><Text style={styles.submitText}>Generate with AI</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={styles.voiceContainer}>
              <Text style={styles.voiceText}>Voice recording requires microphone permissions</Text>
              <TouchableOpacity style={styles.recordButton}><Text style={styles.recordIcon}>🎤</Text></TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {stage === CreatorStage.processing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.processingText}>{t('voice.processing')}</Text>
        </View>
      )}

      {stage === CreatorStage.preview && (
        <View style={styles.content}>
          <Text style={styles.previewTitle}>{t('voice.preview')}</Text>
          <Text style={styles.routineCount}>{t('voice.routine_count', {count: parsedRoutines.length})}</Text>
          {parsedRoutines.map((r, i) => (
            <View key={i} style={styles.routineCard}>
              <Text style={styles.routineTitle}>{r.nombre}</Text>
              <Text style={styles.routineDetail}>{r.descripcion}</Text>
              <Text style={styles.routineMeta}>⏰ {r.hora} | 📅 {r.dias.join(', ')} | 🏷️ {r.categoria}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveAll}><Text style={styles.saveText}>{t('voice.save_all')}</Text></TouchableOpacity>
        </View>
      )}

      {stage === CreatorStage.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>{t(`voice.error_${error}`) || error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setStage(CreatorStage.idle)}><Text>{t('voice.try_again')}</Text></TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.gray200},
  closeButton: {fontSize: 20, color: colors.gray500},
  title: {fontSize: 18, fontWeight: '600'},
  placeholder: {width: 20},
  content: {flex: 1, padding: spacing.lg},
  modeSelector: {flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl},
  modeButton: {flex: 1, padding: spacing.lg, alignItems: 'center', backgroundColor: colors.gray100, borderRadius: borderRadius.lg},
  modeButtonActive: {backgroundColor: colors.primary},
  modeEmoji: {fontSize: 32, marginBottom: spacing.sm},
  inputContainer: {flex: 1},
  textInput: {flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.lg, fontSize: 16, textAlignVertical: 'top'},
  submitButton: {backgroundColor: colors.primary, padding: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.md},
  submitText: {color: colors.white, fontWeight: '600'},
  voiceContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  voiceText: {color: colors.gray500, marginBottom: spacing.xl},
  recordButton: {width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'},
  recordIcon: {fontSize: 32},
  processingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  processingText: {marginTop: spacing.lg, color: colors.gray600},
  previewTitle: {fontSize: 20, fontWeight: 'bold', marginBottom: spacing.sm},
  routineCount: {color: colors.gray500, marginBottom: spacing.lg},
  routineCard: {backgroundColor: colors.white, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.md},
  routineTitle: {fontSize: 16, fontWeight: '600'},
  routineDetail: {color: colors.gray600, marginTop: spacing.xs},
  routineMeta: {color: colors.gray500, marginTop: spacing.sm, fontSize: 12},
  saveButton: {backgroundColor: colors.success, padding: spacing.lg, borderRadius: borderRadius.md, alignItems: 'center'},
  saveText: {color: colors.white, fontWeight: '600'},
  errorContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
  errorIcon: {fontSize: 48, marginBottom: spacing.lg},
  errorText: {textAlign: 'center', color: colors.error, marginBottom: spacing.lg},
  retryButton: {backgroundColor: colors.gray100, padding: spacing.md, borderRadius: borderRadius.md},
});