import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { OnboardingScreenProps } from '../../navigation';
import { COLORS, SPACING } from '../../constants/theme';

type Props = OnboardingScreenProps<'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  function handleContinue() {
    // DO NOT navigate here. AppNavigator's onAuthStateChanged
    // will automatically show MainStack once user is authenticated.
    // The user is already authenticated after registration.
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Runiq</Text>
        </View>

        {/* Welcome message */}
        <View style={styles.messageContainer}>
          <Text style={styles.message}>Your first task is waiting</Text>
        </View>
      </View>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>Let's Go</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: SPACING.xxl,
  },
  logo: {
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: -1,
  },
  messageContainer: {
    marginTop: SPACING.lg,
  },
  message: {
    fontFamily: 'Inter',
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.almostBlack,
    textAlign: 'center',
    lineHeight: 30,
  },
  footer: {
    paddingBottom: SPACING.xl,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
