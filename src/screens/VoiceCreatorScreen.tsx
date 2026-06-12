// src/screens/VoiceCreatorScreen.tsx
import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ActivityIndicator} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {parseRoutineFromText} from '../services/aiParser';
import {ScreenContainer, Card, TextField, Button, GradientView} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {RootStackScreenProps} from '../navigation/types';
import {CreatorStage} from '../types/enums';
import type {ParsedRoutine} from '../types/models';

type Props = RootStackScreenProps<'VoiceCreator'>;

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
              <Text style={styles.voiceText}>Voice recording requires microphone permissions</Text>
              <TouchableOpacity>
                <GradientView variant="ai" style={styles.recordButton}>
                  <Text style={styles.recordIcon}>🎤</Text>
                </GradientView>
              </TouchableOpacity>
            </View>
          )}
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
          <Text style={styles.errorText}>{t(`voice.error_${error}`) || error}</Text>
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
    modeText: {color: colors.textSecondary, fontWeight: typography.medium},
    modeTextActive: {color: colors.white, fontWeight: typography.semibold},
    inputContainer: {flex: 1},
    textInput: {flex: 1, minHeight: 160, textAlignVertical: 'top'},
    submitButton: {marginTop: spacing.md},
    voiceContainer: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    voiceText: {color: colors.textSecondary, marginBottom: spacing.xl, textAlign: 'center'},
    recordButton: {width: 88, height: 88, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center'},
    recordIcon: {fontSize: 32},
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
