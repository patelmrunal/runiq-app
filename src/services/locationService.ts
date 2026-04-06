import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BATTERY_PROMPT_SEEN_KEY = 'runiq_battery_prompt_seen_v1';
const BG_TRACKING_FAILURE_COUNT_KEY = 'runiq_bg_tracking_failure_count_v1';
const REPROMPT_FAILURE_THRESHOLD = 2;

const getBackgroundFailureCount = async (): Promise<number> => {
  const raw = await AsyncStorage.getItem(BG_TRACKING_FAILURE_COUNT_KEY);
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
};

export async function incrementBackgroundTrackingFailureCount(): Promise<number> {
  const next = (await getBackgroundFailureCount()) + 1;
  await AsyncStorage.setItem(BG_TRACKING_FAILURE_COUNT_KEY, String(next));
  return next;
}

export async function resetBackgroundTrackingFailureCount(): Promise<void> {
  await AsyncStorage.setItem(BG_TRACKING_FAILURE_COUNT_KEY, '0');
}

export async function shouldPromptBatteryOptimization(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const promptSeen = (await AsyncStorage.getItem(BATTERY_PROMPT_SEEN_KEY)) === '1';
  const failureCount = await getBackgroundFailureCount();

  if (!promptSeen) return true;
  return failureCount >= REPROMPT_FAILURE_THRESHOLD;
}

/**
 * Request location permissions - works on ALL Android versions
 * Android 6-9: Only fine location needed
 * Android 10+ (API 29+): Background location is a separate request
 */
export async function requestLocationPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Runiq needs GPS to track your runs accurately',
        buttonPositive: 'Allow',
        buttonNegative: 'Not now',
      }
    );

    if (fine !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }

    if (Platform.Version >= 29) {
      const background = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        {
          title: 'Background Location',
          message: 'Allow Runiq to track GPS when screen is off',
          buttonPositive: 'Allow always',
          buttonNegative: 'Not now',
        }
      );

      if (background !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.warn('[locationService] Permission request failed:', error);
    return false;
  }
}

/**
 * Request battery optimization exemption
 * Critical for Oppo, Xiaomi, Samsung, and all Chinese OEM devices
 * Shows user-friendly dialog with direct link to settings
 */
export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const shouldPrompt = await shouldPromptBatteryOptimization();
  if (!shouldPrompt) return;

  await new Promise<void>((resolve) => {
    Alert.alert(
      'Keep Run Tracking Reliable',
      'For stable background tracking, set battery usage for Runiq to unrestricted in app settings.',
      [
        {
          text: 'Open Settings',
          onPress: async () => {
            try {
              await Linking.openSettings();
            } catch (error) {
              console.warn('[locationService] Failed to open settings:', error);
            } finally {
              resolve();
            }
          },
        },
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => resolve(),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => resolve(),
      }
    );
  });

  await AsyncStorage.setItem(BATTERY_PROMPT_SEEN_KEY, '1');
  await resetBackgroundTrackingFailureCount();
}
