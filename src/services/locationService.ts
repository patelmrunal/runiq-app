import { PermissionsAndroid, Platform, Linking, Alert } from 'react-native';

/**
 * Request location permissions - works on ALL Android versions
 * Android 6-9: Only fine location needed
 * Android 10+ (API 29+): Background location is a separate request
 */
export async function requestLocationPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  // Step 1: Request fine location (required for all versions)
  const fine = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location Permission',
      message: 'Runiq needs GPS to track your runs accurately',
      buttonPositive: 'Allow',
      buttonNegative: 'Not now',
    }
  );

  if (fine !== PermissionsAndroid.RESULTS.GRANTED) return false;

  // Step 2: Request background location (Android 10+ / API 29+)
  if (Platform.Version >= 29) {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      {
        title: 'Background Location',
        message: 'Allow Runiq to track GPS when screen is off',
        buttonPositive: 'Allow always',
        buttonNegative: 'Skip',
      }
    );
  }

  return true;
}

/**
 * Request battery optimization exemption
 * Critical for Oppo, Xiaomi, Samsung, and all Chinese OEM devices
 * Shows user-friendly dialog with direct link to settings
 */
export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== 'android') return;

  Alert.alert(
    'Important for Run Tracking',
    'To keep GPS running when your screen is off, please disable battery optimization for Runiq.',
    [
      {
        text: 'Open Settings',
        onPress: () => {
          // Opens app-specific settings where user can disable battery optimization
          Linking.openSettings();
        },
      },
      { text: 'Skip', style: 'cancel' },
    ]
  );
}
