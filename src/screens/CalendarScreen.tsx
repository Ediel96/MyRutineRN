// src/screens/CalendarScreen.tsx
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useRoutinesStore} from '../stores/routinesStore';
import {ScreenContainer, Card} from '../components/ui';
import {useTheme, AppTheme} from '../theme/useTheme';
import type {TabScreenProps} from '../navigation/types';
import {WeekDay} from '../types/enums';

type Props = TabScreenProps<'Calendar'>;

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen({}: Props) {
  const {t} = useTranslation();
  const theme = useTheme();
  const styles = createStyles(theme);
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
      <View key={day} style={styles.cell}>
        <View style={[styles.cellInner, isToday && styles.today]}>
          <Text style={[styles.dayNumber, isToday && styles.todayText]}>{day}</Text>
          {hasE && <Text style={styles.indicator}>{done ? '✅' : '📌'}</Text>}
        </View>
      </View>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={prevMonth} hitSlop={theme.hitSlop}><Text style={styles.navButton}>◀</Text></TouchableOpacity>
          <Text style={styles.monthTitle}>{monthName}</Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={theme.hitSlop}><Text style={styles.navButton}>▶</Text></TouchableOpacity>
        </View>
        <Card style={styles.calendarCard}>
          <View style={styles.weekDays}>
            {DAYS_OF_WEEK.map(d => <Text key={d} style={styles.weekDay}>{d}</Text>)}
          </View>
          <View style={styles.grid}>{cells}</View>
        </Card>
        <View style={styles.legend}>
          <Text style={styles.legendItem}>📌 Scheduled</Text>
          <Text style={styles.legendItem}>✅ Completed</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = ({colors, spacing, radius, typography}: AppTheme) =>
  StyleSheet.create({
    scrollContent: {paddingBottom: spacing.xxl},
    header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg},
    navButton: {fontSize: typography.xxl, color: colors.primary, padding: spacing.sm},
    monthTitle: {fontSize: typography.xxl, fontWeight: typography.bold, color: colors.textPrimary, textTransform: 'capitalize'},
    calendarCard: {marginHorizontal: spacing.lg},
    weekDays: {flexDirection: 'row', marginBottom: spacing.sm},
    weekDay: {flex: 1, textAlign: 'center', fontSize: typography.xs + 1, fontWeight: typography.semibold, color: colors.textSecondary, paddingVertical: spacing.sm},
    grid: {flexDirection: 'row', flexWrap: 'wrap'},
    cell: {width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxs},
    cellInner: {width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg},
    today: {backgroundColor: colors.primary},
    todayText: {fontWeight: typography.bold, color: colors.white},
    dayNumber: {fontSize: typography.md, color: colors.textPrimary},
    indicator: {fontSize: typography.xs, marginTop: 2},
    legend: {flexDirection: 'row', justifyContent: 'center', padding: spacing.lg, gap: spacing.lg},
    legendItem: {fontSize: typography.sm, color: colors.textSecondary},
  });
