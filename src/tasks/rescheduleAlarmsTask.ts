import {createMMKV} from 'react-native-mmkv';
import {AlarmService} from '../services/AlarmService';
import type {Alarm} from '../types/alarm';

const storage = createMMKV({id: 'alarms-storage'});
const STORAGE_KEY = 'alarms-list';

const rescheduleAlarmsTask = async () => {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) {
    return;
  }
  const alarms: Alarm[] = JSON.parse(raw);
  const enabled = alarms.filter(a => a.enabled);
  await Promise.allSettled(enabled.map(alarm => AlarmService.schedule(alarm)));
};

export default rescheduleAlarmsTask;
