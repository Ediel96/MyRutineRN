// src/screens/WeekScreen.tsx
import React, {useEffect} from 'react';
import {Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {ScreenContainer, Card} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {TabScreenProps} from '../navigation/types';
import {WeekDay} from '../types/enums';

const DAYS = [WeekDay.monday, WeekDay.tuesday, WeekDay.wednesday, WeekDay.thursday, WeekDay.friday, WeekDay.saturday, WeekDay.sunday];

type Props = TabScreenProps<'Week'>;

export default function WeekScreen({}: Props) {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const {loadData, getEventsByDay} = useRoutinesStore();

  useEffect(() => { loadData(); }, []);

  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('tabs.week')}</Text>
        {DAYS.map((day, index) => {
          const events = getEventsByDay(day);
          const isToday = index === todayIndex;
          return (
            <Card
              key={day}
              style={styles.daySection}
              variant={isToday ? 'surfaceAlt' : 'surface'}
              borderLeftColor={isToday ? theme.colors.primary : undefined}>
              <Text style={[styles.dayName, isToday && styles.todayText]}>
                {t(`weekdays.${day}`)}
              </Text>
              {events.length === 0 ? (
                <Text style={styles.noEvents}>-</Text>
              ) : (
                events.map(event => (
                  <TouchableOpacity key={event.id} style={styles.eventItem} onPress={() => navigation.navigate('EventDetail', {eventId: event.id})}>
                    <Text style={styles.eventTime}>{event.startTime}</Text>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                  </TouchableOpacity>
                ))
              )}
            </Card>
          );
        })}
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, typography}: AppTheme) =>
  StyleSheet.create({
    scrollView: {flex: 1},
    scrollContent: {paddingBottom: spacing.xxl},
    title: {fontSize: typography.title, fontWeight: typography.bold, color: colors.textPrimary, padding: spacing.lg},
    daySection: {marginHorizontal: spacing.lg, marginBottom: spacing.md},
    dayName: {fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: spacing.sm},
    todayText: {color: colors.primary},
    noEvents: {color: colors.textTertiary, fontStyle: 'italic'},
    eventItem: {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs},
    eventTime: {fontSize: typography.sm, color: colors.textSecondary, width: 50},
    eventTitle: {fontSize: typography.md, color: colors.textPrimary},
  });
