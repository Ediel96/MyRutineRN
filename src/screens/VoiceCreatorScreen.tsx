// src/screens/VoiceCreatorScreen.tsx
import React, {useRef, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, PermissionsAndroid} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {useRoutinesStore} from '../stores/routinesStore';
import {parseRoutineFromText, parseRoutineFromAudio} from '../services/aiParser';
import {ScreenContainer, Card, TextField, Button, GradientView} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {CreatorStage} from '../types/enums';
import type {ParsedRoutine} from '../types/models';

type Props = RootStackScreenProps<'VoiceCreator'>;

const ERROR_KEY_MAP: Record<string, string> = {
  missingAPIKey: 'error_missing_key',
  transcriptionFailed: 'error_transcription',
  parsingFailed: 'error_parsing',
  networkError: 'error_network',
  invalidJSON: 'error_invalid_json',
  unknownProvider: 'error_unknown_provider',
  permissionDenied: 'error_permission_denied',
};

async function requestMicrophonePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export default function VoiceCreatorScreen() {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {addEvent, events} = useRoutinesStore();
  const [stage, setStage] = useState<CreatorStage>(CreatorStage.idle);
  const [mode, setMode] = useState<'voice' | 'text'>('text');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [recordTime, setRecordTime] = useState('00:00');
  const [parsedRoutines, setParsedRoutines] = useState<ParsedRoutine[]>([]);
  const recorderRef = useRef<AudioRecorderPlayer | null>(null);

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

  const handleStartRecording = async () => {
    const granted = await requestMicrophonePermission();
    if (!granted) {
      setError('permissionDenied');
      setStage(CreatorStage.error);
      return;
    }

    const recorder = new AudioRecorderPlayer();
    recorderRef.current = recorder;
    setRecordTime('00:00');
    await recorder.startRecorder();
    recorder.addRecordBackListener(e => {
      setRecordTime(recorder.mmssss(Math.floor(e.currentPosition)));
    });
    setStage(CreatorStage.recording);
  };

  const handleStopRecording = async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    const uri = await recorder.stopRecorder();
    recorder.removeRecordBackListener();
    recorderRef.current = null;

    setStage(CreatorStage.processing);
    setError('');
    const result = await parseRoutineFromAudio(uri, events);
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

  const errorMessage = () => {
    const code = error.split(':')[0].trim();
    const key = ERROR_KEY_MAP[code];
    return key ? t(`voice.${key}`) : error;
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={theme.hitSlop}><Text style={styles.closeButton}>✕</Text></TouchableOpacity>
        <Text style={styles.title}>{t('voice.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      {stage === CreatorStage.idle && (
        <View style={styles.content}>
          <View style={styles.modeSelector}>
            <TouchableOpacity style={styles.modeButtonWrapper} onPress={() => setMode('text')}>
              {mode === 'text' ? (
                <GradientView variant="ai" style={styles.modeButton}>
                  <Text style={styles.modeEmoji}>💬</Text><Text style={styles.modeTextActive}>{t('voice.text_mode')}</Text>
                </GradientView>
              ) : (
                <View style={[styles.modeButton, styles.modeButtonInactive]}>
                  <Text style={styles.modeEmoji}>💬</Text><Text style={styles.modeText}>{t('voice.text_mode')}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modeButtonWrapper} onPress={() => setMode('voice')}>
              {mode === 'voice' ? (
                <GradientView variant="ai" style={styles.modeButton}>
                  <Text style={styles.modeEmoji}>🎤</Text><Text style={styles.modeTextActive}>{t('voice.voice_mode')}</Text>
                </GradientView>
              ) : (
                <View style={[styles.modeButton, styles.modeButtonInactive]}>
                  <Text style={styles.modeEmoji}>🎤</Text><Text style={styles.modeText}>{t('voice.voice_mode')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          {mode === 'text' ? (
            <View style={styles.inputContainer}>
              <TextField
                value={text}
                onChangeText={setText}
                placeholder="Describe your routine... (e.g., 'I want to work out every morning at 7am')"
                multiline
                style={styles.textInput}
              />
              <Button title="Generate with AI" onPress={handleTextSubmit} style={styles.submitButton} />
            </View>
          ) : (
            <View style={styles.voiceContainer}>
              <Text style={styles.voiceText}>{t('voice.record')}</Text>
              <TouchableOpacity onPress={handleStartRecording}>
                <GradientView variant="ai" style={styles.recordButton}>
                  <Text style={styles.recordIcon}>🎤</Text>
                </GradientView>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {stage === CreatorStage.recording && (
        <View style={styles.voiceContainer}>
          <Text style={styles.recordTime}>{recordTime}</Text>
          <Text style={styles.voiceText}>{t('voice.stop_recording')}</Text>
          <TouchableOpacity onPress={handleStopRecording}>
            <View style={[styles.recordButton, styles.stopButton]}>
              <View style={styles.stopIcon} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {stage === CreatorStage.processing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accentAI} />
          <Text style={styles.processingText}>{t('voice.processing')}</Text>
        </View>
      )}

      {stage === CreatorStage.preview && (
        <View style={styles.content}>
          <Text style={styles.previewTitle}>{t('voice.preview')}</Text>
          <Text style={styles.routineCount}>{t('voice.routine_count', {count: parsedRoutines.length})}</Text>
          {parsedRoutines.map((r, i) => (
            <Card key={i} style={styles.routineCard}>
              <Text style={styles.routineTitle}>{r.nombre}</Text>
              <Text style={styles.routineDetail}>{r.descripcion}</Text>
              <Text style={styles.routineMeta}>⏰ {r.hora} | 📅 {r.dias.join(', ')} | 🏷️ {r.categoria}</Text>
            </Card>
          ))}
          <Button title={t('voice.save_all')} onPress={handleSaveAll} style={styles.saveButton} />
        </View>
      )}

      {stage === CreatorStage.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>{errorMessage()}</Text>
          <Button title={t('voice.try_again')} variant="secondary" onPress={() => setStage(CreatorStage.idle)} fullWidth={false} />
        </View>
      )}
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border},
    closeButton: {fontSize: typography.xxl, color: colors.textSecondary},
    title: {fontSize: typography.xl, fontWeight: typography.semibold, color: colors.textPrimary},
    placeholder: {width: 24},
    content: {flex: 1, padding: spacing.lg},
    modeSelector: {flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl},
    modeButtonWrapper: {flex: 1},
    modeButton: {padding: spacing.lg, alignItems: 'center', borderRadius: radius.xl},
    modeButtonInactive: {backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border},
    modeEmoji: {fontSize: 32, marginBottom: spacing.sm},
    modeText: {color: colors.textSecondary, fontWeight: typography.medium, fontSize: typography.sm},
    modeTextActive: {color: colors.white, fontWeight: typography.semibold, fontSize: typography.sm},
    inputContainer: {flex: 1},
    textInput: {flex: 1, minHeight: 160, textAlignVertical: 'top'},
    submitButton: {marginTop: spacing.md},
    voiceContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    voiceText: {color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center'},
    recordButton: {width: 88, height: 88, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center'},
    recordIcon: {fontSize: 32},
    recordTime: {fontSize: typography.title, fontWeight: typography.bold, color: colors.textPrimary, marginBottom: spacing.sm},
    stopButton: {backgroundColor: colors.error},
    stopIcon: {width: 28, height: 28, borderRadius: radius.sm, backgroundColor: colors.white},
    processingContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    processingText: {marginTop: spacing.lg, color: colors.textSecondary},
    previewTitle: {fontSize: typography.xxl, fontWeight: typography.bold, color: colors.textPrimary, marginBottom: spacing.sm},
    routineCount: {color: colors.textSecondary, marginBottom: spacing.lg},
    routineCard: {marginBottom: spacing.md},
    routineTitle: {fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary},
    routineDetail: {color: colors.textSecondary, marginTop: spacing.xs},
    routineMeta: {color: colors.textTertiary, marginTop: spacing.sm, fontSize: typography.sm},
    saveButton: {marginTop: spacing.sm},
    errorContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl},
    errorIcon: {fontSize: 48, marginBottom: spacing.lg},
    errorText: {textAlign: 'center', color: colors.error, marginBottom: spacing.lg},
  });
