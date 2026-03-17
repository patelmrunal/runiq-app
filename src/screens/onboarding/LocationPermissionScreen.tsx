import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { request, PERMISSIONS, RESULTS, type PermissionStatus } from 'react-native-permissions';
import type { OnboardingScreenProps } from '../../navigation';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants';

type Props = OnboardingScreenProps<'LocationPermission'>;

export default function LocationPermissionScreen({ navigation }: Props) {
  const [denied, setDenied] = useState(false);
  const [requesting, setRequesting] = useState(false);

  async function handleRequest() {
    setRequesting(true);
    try {
      const permission =
        Platform.OS === 'ios'
          ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
          : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

      const result: PermissionStatus = await request(permission);

      if (result === RESULTS.GRANTED) {
        navigation.navigate('Questionnaire');
      } else {
        setDenied(true);
      }
    } catch {
      setDenied(true);
    } finally {
      setRequesting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>Runiq</Text>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.heading}>
          Runiq uses GPS to track your runs and show you local leaderboards
        </Text>
        <Text style={styles.explanation}>
          Your location is only active while you record a run — never in the background. It lets us measure your distance accurately and rank you against nearby runners.
        </Text>

        {denied && (
          <View style={styles.denialBox}>
            <Text style={styles.denialHeading}>Permission not granted</Text>
            <Text style={styles.denialBody}>
              Without location access, run tracking and leaderboards won't work. You can grant permission now or enable it later in your device Settings.
            </Text>
          </View>
        )}
      </View>

      {/* Footer CTAs */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, requesting && styles.buttonDisabled]}
          onPress={handleRequest}
          activeOpacity={0.85}
          disabled={requesting}
        >
          <Text style={styles.primaryButtonText}>
            {denied ? 'Try Again' : 'Allow Location Access'}
          </Text>
        </TouchableOpacity>

        {denied && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Questionnaire')}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Continue without location</Text>
          </TouchableOpacity>
        )}
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
  logoContainer: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
  },
  logo: {
    fontFamily: Typography.fontFamily,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.ACCENT,
    letterSpacing: -0.5,
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
  explanation: {
    fontFamily: Typography.fontFamily,
    ...Typography.body,
    color: Colors.SECONDARY_TEXT,
    lineHeight: 22,
  },
  denialBox: {
    marginTop: Spacing.lg,
    backgroundColor: '#FFF1F3',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.ACCENT,
  },
  denialHeading: {
    fontFamily: Typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ACCENT,
    marginBottom: Spacing.xs,
  },
  denialBody: {
    fontFamily: Typography.fontFamily,
    ...Typography.body,
    color: Colors.PRIMARY_TEXT,
    lineHeight: 21,
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
  secondaryButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: Typography.fontFamily,
    ...Typography.body,
    color: Colors.SECONDARY_TEXT,
  },
});
