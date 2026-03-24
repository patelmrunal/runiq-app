import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { loginWithEmail } from '../../services/firebase/auth';

// ─── Local param list (mirrors AuthStackParamList in AppNavigator) ──────────────

type AuthParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
};

type Props = NativeStackScreenProps<AuthParamList, 'Login'>;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  function clearError() {
    if (error) setError(null);
  }

  async function handleLogin() {
    if (submitting) return;
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }

    setSubmitting(true);
    try {
      await loginWithEmail(email.trim(), password);
      // AppNavigator's onAuthStateChanged listener detects the new user
      // and swaps the root stack from Auth → Main automatically.
    } catch (err: unknown) {
      setError((err as Error).message.replace('Login failed: ', ''));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={16}
      >
        {/* Scrollable inner — centres content vertically */}
        <View style={styles.inner}>

          {/* Logo + tagline with gradient background */}
          <View style={styles.logoSection}>
            <View style={styles.gradientCircleContainer}>
              <LinearGradient
                colors={['#E94560', '#FF6B6B']}
                style={styles.gradientCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </View>
            <Text style={styles.logo}>Runiq</Text>
            <Text style={styles.tagline}>Run. Grow. Become.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>

            {/* Email input */}
            <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
              <TextInput
                style={styles.inputField}
                value={email}
                onChangeText={(v) => { clearError(); setEmail(v); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="Email"
                placeholderTextColor="#A1A1AA"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!submitting}
              />
            </View>

            {/* Password input + eye toggle */}
            <View style={[styles.inputWrapper, styles.passwordWrapper, passwordFocused && styles.inputWrapperFocused]}>
              <TextInput
                ref={passwordRef}
                style={[styles.inputField, styles.passwordField]}
                value={password}
                onChangeText={(v) => { clearError(); setPassword(v); }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="Password"
                placeholderTextColor="#A1A1AA"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!submitting}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.eyeLabel}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotRow}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Error message */}
            {!!error && <Text style={styles.errorText}>{error}</Text>}

          </View>
        </View>

        {/* Footer — pinned to bottom */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.loginButton, submitting && styles.buttonDisabled]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupRow}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.7}
          >
            <Text style={styles.signupText}>
              Don't have an account?{' '}
              <Text style={styles.signupAccent}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  kav: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },

  // Logo
  logoSection: {
    alignItems: 'center',
    marginBottom: 64,
  },
  gradientCircleContainer: {
    position: 'absolute',
    top: -60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.12,
  },
  logo: {
    fontFamily: 'Inter',
    fontSize: 52,
    fontWeight: '700',
    color: '#09090B',
    letterSpacing: -1.5,
  },
  tagline: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#71717A',
    marginTop: 8,
    letterSpacing: 0.5,
  },

  // Form
  form: {
    gap: 16,
  },
  inputWrapper: {
    backgroundColor: '#F4F4F5',
    borderRadius: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  inputWrapperFocused: {
    borderBottomColor: '#E94560',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#09090B',
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 18 : 16,
  },
  passwordField: {
    flex: 1,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  eyeLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#E94560',
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  forgotText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#71717A',
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#E94560',
    marginTop: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },
  loginButton: {
    backgroundColor: '#E94560',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signupRow: {
    alignItems: 'center',
  },
  signupText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#71717A',
  },
  signupAccent: {
    color: '#E94560',
    fontWeight: '600',
  },
});
