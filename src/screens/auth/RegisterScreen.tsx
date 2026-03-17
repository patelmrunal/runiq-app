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
  label: string;
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
    label: 'Full Name',
    placeholder: 'Your full name',
    autoCapitalize: 'words',
    validate: (v) => {
      if (!v.trim()) return 'Full name is required';
      if (v.trim().length < 2) return 'Name must be at least 2 characters';
      return null;
    },
  },
  {
    field: 'username',
    label: 'Username',
    placeholder: 'Choose a username (letters and numbers only)',
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
    label: 'Email',
    placeholder: 'your@email.com',
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
    label: 'Password',
    placeholder: 'Min 8 characters',
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

  const inputRef = useRef<TextInput>(null);
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
    setStep((s) => s - 1);
  }

  async function handleNext() {
    const fieldError = current.validate(form[current.field]);
    if (fieldError) {
      setError(fieldError);
      return;
    }

    if (!isLast) {
      setStep((s) => s + 1);
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
      navigation.navigate('Onboarding');
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
        <View
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
        <View style={styles.content}>
          <Text style={styles.fieldLabel}>{current.label}</Text>

          <View
            style={[
              styles.inputWrapper,
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
        </View>

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
    height: 3,
    backgroundColor: '#E4E4E7',
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: 'Inter',
    fontSize: 30,
    color: '#71717A',
    lineHeight: 34,
  },
  stepLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#71717A',
    letterSpacing: 0.4,
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#09090B',
    marginBottom: 10,
  },

  // Input
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: '#E4E4E7',
    borderRadius: 12,
    backgroundColor: '#F4F4F5',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#09090B',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 13,
  },
  passwordField: {
    flex: 1,
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  eyeLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: '#71717A',
  },

  // Hint / error
  hintText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#A1A1AA',
    marginTop: 6,
    marginLeft: 2,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: '#E94560',
    marginTop: 6,
    marginLeft: 2,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },
  nextButton: {
    backgroundColor: '#E94560',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontFamily: 'Inter',
    fontSize: 16,
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
