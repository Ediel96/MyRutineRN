/**
 * @format
 */

import 'react-native-get-random-values';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import rescheduleAlarmsTask from './src/tasks/rescheduleAlarmsTask';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerHeadlessTask('RescheduleAlarms', () => rescheduleAlarmsTask);
