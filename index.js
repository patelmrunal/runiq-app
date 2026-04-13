/**
 * @format
 */

import 'react-native-reanimated';
import { AppRegistry } from 'react-native';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Required by notifee to handle Android background events.
notifee.onBackgroundEvent(async () => {
	return Promise.resolve();
});

AppRegistry.registerComponent(appName, () => App);
