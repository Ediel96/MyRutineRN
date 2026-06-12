// src/screens/CalendarScreen.tsx
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {colors, spacing} from '../theme/AppTheme';
import type {TabScreenProps} from '../navigation/types';
import {WeekDay} from '../types/enums';

type Props = TabScreenProps<'Calendar'>;

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen({}: Props) {
  const {t} = useTranslation();
  const {loadData, events, completions} = useRoutinesStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => { loadData(); }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleDateString(undefined, {month: 'long', year: 'numeric'});

  const hasEvent = (day: number) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    const weekDayMap: Record<number, WeekDay> = {0: WeekDay.sunday, 1: WeekDay.monday, 2: WeekDay.tuesday, 3: WeekDay.wednesday, 4: WeekDay.thursday, 5: WeekDay.friday, 6: WeekDay.saturday};
    const weekday = weekDayMap[dayOfWeek];
    return events.some(e => e.dayRaw === weekday);
  };

  const isCompleted = (day: number) => {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    return completions.some(c => {
      const cDate = new Date(c.date);
      cDate.setHours(0, 0, 0, 0);
      return cDate.getTime() === date.getTime();
    });
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(<View key={`empty-${i}`} style={styles.cell} />);
  for (let day = 1; day <= daysInMonth; day++) {
    const today = new Date();
    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
    const hasE = hasEvent(day);
    const done = isCompleted(day);
    cells.push(
      <View key={day} style={[styles.cell, isToday && styles.today]}>
        <Text style={[styles.dayNumber, isToday && styles.todayText]}>{day}</Text>
        {hasE && <Text style={styles.indicator}>{done ? '✅' : '📌'}</Text>}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={prevMonth}><Text style={styles.navButton}>◀</Text></TouchableOpacity>
          <Text style={styles.monthTitle}>{monthName}</Text>
          <TouchableOpacity onPress={nextMonth}><Text style={styles.navButton}>▶</Text></TouchableOpacity>
        </View>
        <View style={styles.weekDays}>
          {DAYS_OF_WEEK.map(d => <Text key={d} style={styles.weekDay}>{d}</Text>)}
        </View>
        <View style={styles.grid}>{cells}</View>
        <View style={styles.legend}>
          <Text style={styles.legendItem}>📌 Scheduled</Text>
          <Text style={styles.legendItem}>✅ Completed</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.backgroundLight},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg},
  navButton: {fontSize: 20, color: colors.primary},
  monthTitle: {fontSize: 20, fontWeight: 'bold', color: colors.textPrimaryLight},
  weekDays: {flexDirection: 'row', paddingHorizontal: spacing.sm},
  weekDay: {flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.gray500, paddingVertical: spacing.sm},
  grid: {flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm},
  cell: {width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xs},
  today: {backgroundColor: colors.primary + '30', borderRadius: 20},
  todayText: {fontWeight: 'bold', color: colors.primary},
  dayNumber: {fontSize: 14, color: colors.textPrimaryLight},
  indicator: {fontSize: 10, marginTop: 2},
  legend: {flexDirection: 'row', justifyContent: 'center', padding: spacing.lg, gap: spacing.lg},
  legendItem: {fontSize: 12, color: colors.gray600},
});