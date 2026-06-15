// src/screens/TodayScreen.tsx
// Pantalla principal de hoy - equivalente a Views/Today/TodayView.swift

import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import TodayEventRow from '../components/TodayEventRow';
import {ScreenContainer, GradientView, SkeletonRow} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {TabScreenProps} from '../navigation/types';

type Props = TabScreenProps<'Today'>;

export default function TodayScreen({}: Props) {
  const navigation = useNavigation();
  const {t, i18n} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {loadData, isLoading, getEventsToday, getTodayProgress} = useRoutinesStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  const eventsToday = getEventsToday();
  const progress = getTodayProgress();
  const progressTotal = progress.total > 0 ? progress.total : eventsToday.length;
  const progressCompleted = Math.min(progress.completed, progressTotal);
  const progressPct = progressTotal > 0 ? progressCompleted / progressTotal : 0;

  const progressWidth = useSharedValue(0);
  useEffect(() => {
    progressWidth.value = withTiming(progressPct, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progressPct, progressWidth]);
  const progressFillStyle = useAnimatedStyle(() => ({width: `${progressWidth.value * 100}%`}));

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t('today.greeting_morning') :
    hour < 18 ? t('today.greeting_afternoon') :
    t('today.greeting_evening');

  const today = new Date();
  const dateStr = today.toLocaleDateString(i18n.language, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleVoiceCreator = () => {
    navigation.navigate('VoiceCreator');
  };

  const handleAddRoutine = () => {
    navigation.navigate('EventEditor', {});
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <GradientView style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>{dateStr}</Text>
          {progressTotal > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <Animated.View style={[styles.progressFill, progressFillStyle]} />
                </View>
                <Text style={styles.progressLabel} numberOfLines={1}>
                  {t('today.progress', {completed: progressCompleted, total: progressTotal})}
                </Text>
              </View>
              <View style={styles.progressMetaRow}>
                <Text style={styles.progressMetaText}>{t('today.progress_done', {count: progressCompleted})}</Text>
                <Text style={styles.progressMetaText}>{t('today.progress_total', {count: progressTotal})}</Text>
              </View>
            </View>
          )}
        </GradientView>

        {isLoading ? (
          <View style={styles.eventsList}>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : eventsToday.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌙</Text>
            <Text style={styles.emptyTitle}>{t('today.free_day')}</Text>
            <Text style={styles.emptyMessage}>{t('today.free_day_message')}</Text>
            <Text style={styles.emptyCta}>{t('today.free_day_cta')}</Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {eventsToday.map(event => (
              <TodayEventRow key={event.id} event={event} />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.fabContainer}>
        <TouchableOpacity onPress={handleAddRoutine} activeOpacity={0.85} style={styles.fabWrapper}>
          <GradientView style={styles.fabSmall}>
            <Text style={styles.fabIconSmall}>➕</Text>
          </GradientView>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleVoiceCreator} activeOpacity={0.85} style={styles.fabWrapper}>
          <GradientView variant="ai" style={styles.fab}>
            <Text style={styles.fabIcon}>🎤</Text>
          </GradientView>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography, shadows}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: 120},
    header: {
      marginTop: 24,
      marginHorizontal: 16,
      borderRadius: 22,
      paddingTop: 22,
      paddingBottom: 22,
      paddingHorizontal: 20,
      shadowColor: '#5B7FFF',
      shadowOpacity: 0.18,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: 4},
      elevation: 5,
    },
    greeting: {fontSize: 30, lineHeight: 34, fontWeight: '700', color: '#FFFFFF'},
    date: {fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.72)', marginTop: 4},
    progressSection: {marginTop: 20},
    progressRow: {gap: 10},
    progressBar: {height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden'},
    progressFill: {height: '100%', borderRadius: 4, backgroundColor: '#FFFFFF'},
    progressLabel: {alignSelf: 'flex-end', fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.72)'},
    progressMetaRow: {marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    progressMetaText: {fontSize: 12, fontWeight: '600', color: '#FFFFFF'},
    eventsList: {paddingVertical: spacing.sm},
    emptyState: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80},
    emptyIcon: {fontSize: 64, marginBottom: spacing.lg},
    emptyTitle: {fontSize: typography.xxl, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.sm},
    emptyMessage: {fontSize: typography.md, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xxl},
    emptyCta: {fontSize: typography.sm, color: colors.primary, fontWeight: typography.semibold, textAlign: 'center', marginTop: spacing.md},
    fabContainer: {position: 'absolute', bottom: 24, right: 24, alignItems: 'center', gap: spacing.md},
    fabWrapper: {...shadows.lg, borderRadius: radius.full},
    fab: {width: 60, height: 60, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center'},
    fabSmall: {width: 48, height: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center'},
    fabIcon: {fontSize: 26},
    fabIconSmall: {fontSize: 20},
  });
