import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { OnboardingScreenProps } from '../../navigation';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants';

type Props = OnboardingScreenProps<'LocationPermission'>;

export default function LocationPermissionScreen({ navigation }: Props) {
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Runiq uses GPS to track your runs and show local leaderboards',
          buttonPositive: 'Allow',
          buttonNegative: 'Skip',
        }
      );
      // Whether granted or denied, move forward
      navigation.navigate('Questionnaire');
    } catch {
      navigation.navigate('Questionnaire');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.heading}>
          Runiq uses GPS to track your runs and show you local leaderboards
        </Text>
      </View>

      {/* Footer CTAs */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, requesting && styles.buttonDisabled]}
          onPress={handleAllow}
          activeOpacity={0.85}
          disabled={requesting}
        >
          <Text style={styles.primaryButtonText}>Allow Location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('Questionnaire')}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.PRIMARY_BG,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: Spacing.xl,
  },
  heading: {
    fontFamily: Typography.fontFamily,
    ...Typography.screenTitle,
    color: Colors.PRIMARY_TEXT,
    marginBottom: Spacing.md,
    lineHeight: 34,
  },
  footer: {
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.ACCENT,
    borderRadius: BorderRadius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontFamily: Typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontFamily: Typography.fontFamily,
    fontSize: 15,
    color: Colors.SECONDARY_TEXT,
  },
});
