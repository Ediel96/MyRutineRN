// src/screens/WeekScreen.tsx
import React, {useEffect} from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {colors, spacing} from '../theme/AppTheme';
import type {TabScreenProps} from '../navigation/types';
import {WeekDay} from '../types/enums';

const DAYS = [WeekDay.monday, WeekDay.tuesday, WeekDay.wednesday, WeekDay.thursday, WeekDay.friday, WeekDay.saturday, WeekDay.sunday];

type Props = TabScreenProps<'Week'>;

export default function WeekScreen({}: Props) {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const {loadData, getEventsByDay} = useRoutinesStore();

  useEffect(() => { loadData(); }, []);

  const dayKeys = Object.keys(WeekDay).filter(k => !isNaN(Number(k)));
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>{t('tabs.week')}</Text>
        {DAYS.map((day, index) => {
          const events = getEventsByDay(day);
          return (
            <View key={day} style={[styles.daySection, index === todayIndex && styles.todaySection]}>
              <Text style={[styles.dayName, index === todayIndex && styles.todayText]}>
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
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  scrollView: {flex: 1},
  title: {fontSize: 24, fontWeight: 'bold', color: colors.textPrimaryLight, padding: spacing.lg},
  daySection: {paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray200},
  todaySection: {backgroundColor: colors.primaryLight + '20'},
  dayName: {fontSize: 16, fontWeight: '600', color: colors.textPrimaryLight, marginBottom: spacing.sm},
  todayText: {color: colors.primary},
  noEvents: {color: colors.gray400, fontStyle: 'italic'},
  eventItem: {flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs},
  eventTime: {fontSize: 12, color: colors.gray500, width: 50},
  eventTitle: {fontSize: 14, color: colors.textPrimaryLight},
});