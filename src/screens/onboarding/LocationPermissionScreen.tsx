import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { OnboardingScreenProps } from '../../navigation';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants';
import { requestLocationPermissions } from '../../services/locationService';

type Props = OnboardingScreenProps<'LocationPermission'>;

export default function LocationPermissionScreen({ navigation }: Props) {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAllow = async () => {
    if (isRequesting) return; // prevent double tap
    setIsRequesting(true);

    try {
      await requestLocationPermissions();
    } catch (e) {
      console.log('permission error', e);
    } finally {
      setIsRequesting(false);
      // Always navigate forward no matter what
      navigation.replace('Questionnaire');
    }
  };

  const handleSkip = () => {
    navigation.replace('Questionnaire');
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
          style={[styles.primaryButton, isRequesting && styles.buttonDisabled]}
          onPress={handleAllow}
          activeOpacity={0.85}
          disabled={isRequesting}
        >
          <Text style={styles.primaryButtonText}>Allow Location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          disabled={isRequesting}
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
