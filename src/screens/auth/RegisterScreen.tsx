import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { registerWithEmail } from '../../services/firebase/auth';

// ─── Local param list (mirrors AuthStackParamList in AppNavigator) ──────────────

type AuthParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
};

type Props = NativeStackScreenProps<AuthParamList, 'Register'>;

// ─── Form ──────────────────────────────────────────────────────────────────────

interface FormState {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

// ─── Steps config ──────────────────────────────────────────────────────────────

interface StepConfig {
  field: keyof FormState;
  question: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  hasPasswordToggle?: boolean;
  autoCapitalize?: 'none' | 'words';
  hint?: string;
  validate: (value: string) => string | null;
}

const STEPS: StepConfig[] = [
  {
    field: 'fullName',
    question: "What's your name?",
    placeholder: 'Enter your full name',
    autoCapitalize: 'words',
    validate: (v) => {
      if (!v.trim()) return 'Full name is required';
      if (v.trim().length < 2) return 'Name must be at least 2 characters';
      return null;
    },
  },
  {
    field: 'username',
    question: 'Choose a username',
    placeholder: 'Username',
    autoCapitalize: 'none',
    hint: '3–20 characters, letters and numbers only',
    validate: (v) => {
      if (!v.trim()) return 'Username is required';
      if (v.length < 3 || v.length > 20) return 'Must be 3–20 characters';
      if (!/^[a-zA-Z0-9]+$/.test(v)) return 'Letters and numbers only';
      return null;
    },
  },
  {
    field: 'email',
    question: "What's your email?",
    placeholder: 'you@example.com',
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    validate: (v) => {
      if (!v.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email';
      return null;
    },
  },
  {
    field: 'password',
    question: 'Create a password',
    placeholder: 'Minimum 8 characters',
    autoCapitalize: 'none',
    hasPasswordToggle: true,
    validate: (v) => {
      if (!v) return 'Password is required';
      if (v.length < 8) return 'Minimum 8 characters';
      return null;
    },
  },
];

const TOTAL = STEPS.length;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    fullName: '',
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const current = STEPS[step];
  const isLast = step === TOTAL - 1;

  // Refocus input whenever step advances
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [step]);

  function handleChange(value: string) {
    if (error) setError(null);
    setForm((prev) => ({ ...prev, [current.field]: value }));
  }

  function handleBack() {
    setError(null);
    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep((s) => s - 1);
      fadeAnim.setValue(1);
    });
  }

  async function handleNext() {
    const fieldError = current.validate(form[current.field]);
    if (fieldError) {
      setError(fieldError);
      return;
    }

    if (!isLast) {
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setStep((s) => s + 1);
        fadeAnim.setValue(1);
      });
      return;
    }

    setSubmitting(true);
    try {
      await registerWithEmail({
        displayName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      // DO NOT navigate here. AppNavigator's onAuthStateChanged
      // will automatically swap to MainStack when user is created.
    } catch (err: unknown) {
      setError((err as Error).message.replace('Registration failed: ', ''));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>

      {/* Progress bar — outside KAV so it doesn't jump */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: `${((step + 1) / TOTAL) * 100}%` },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={16}
      >
        {/* Header */}
        <View style={styles.header}>
          {step > 0 ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}

          <Text style={styles.stepLabel}>{step + 1} / {TOTAL}</Text>

          {/* Spacer to balance back button */}
          <View style={styles.backButton} />
        </View>

        {/* Content — flex 1 centres the field vertically */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text style={styles.question}>{current.question}</Text>

          <View
            style={[
              styles.inputWrapper,
              focused && styles.inputWrapperFocused,
              current.hasPasswordToggle && styles.passwordWrapper,
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.inputField,
                current.hasPasswordToggle && styles.passwordField,
              ]}
              value={form[current.field]}
              onChangeText={handleChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={current.placeholder}
              placeholderTextColor="#A1A1AA"
              keyboardType={current.keyboardType ?? 'default'}
              secureTextEntry={current.hasPasswordToggle ? !showPassword : false}
              autoCapitalize={current.autoCapitalize ?? 'sentences'}
              autoCorrect={false}
              returnKeyType={isLast ? 'done' : 'next'}
              onSubmitEditing={handleNext}
              editable={!submitting}
            />

            {current.hasPasswordToggle && (
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
            )}
          </View>

          {/* Hint shown when no error (username step only) */}
          {current.hint && !error && (
            <Text style={styles.hintText}>{current.hint}</Text>
          )}

          {/* Validation error */}
          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextButton, submitting && styles.buttonDisabled]}
            onPress={handleNext}
            activeOpacity={0.85}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.nextButtonText}>
                {isLast ? 'Create Account' : 'Next'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginRow}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginAccent}>Login</Text>
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

  // Progress bar
  progressTrack: {
    height: 4,
    backgroundColor: '#F4F4F5',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#E94560',
  },

  kav: {
    flex: 1,
  },

  // Header row
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: 'Inter',
    fontSize: 32,
    color: '#71717A',
    lineHeight: 36,
  },
  stepLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#71717A',
    letterSpacing: 0.5,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  question: {
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '700',
    color: '#09090B',
    marginBottom: 32,
    lineHeight: 40,
  },

  // Input
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
    fontSize: 18,
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

  // Hint / error
  hintText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#A1A1AA',
    marginTop: 12,
    marginLeft: 4,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#E94560',
    marginTop: 12,
    marginLeft: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },
  nextButton: {
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
  nextButtonText: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loginRow: {
    alignItems: 'center',
  },
  loginText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: '#71717A',
  },
  loginAccent: {
    color: '#E94560',
    fontWeight: '600',
  },
});
