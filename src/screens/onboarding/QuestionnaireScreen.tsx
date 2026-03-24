import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import type { OnboardingScreenProps } from '../../navigation';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants';

// ─── Types ─────────────────────────────────────────────────────────────────────

type RunFrequency = 'never' | 'sometimes' | 'regularly';
type PreferredTime = 'morning' | 'evening' | 'flexible';
type PrimaryGoal = 'fitness' | 'habit' | 'weight' | 'community';

interface Answers {
  runFrequency: RunFrequency | null;
  preferredTime: PreferredTime | null;
  primaryGoal: PrimaryGoal | null;
}

interface Question<T extends string> {
  emoji: string;
  text: string;
  options: { label: string; value: T }[];
}

// ─── Questions config ──────────────────────────────────────────────────────────

const Q1: Question<RunFrequency> = {
  emoji: '🏃',
  text: 'How often do you currently run?',
  options: [
    { label: 'Never', value: 'never' },
    { label: 'Sometimes', value: 'sometimes' },
    { label: 'Regularly', value: 'regularly' },
  ],
};

const Q2: Question<PreferredTime> = {
  emoji: '🕐',
  text: 'When do you prefer to run?',
  options: [
    { label: 'Morning', value: 'morning' },
    { label: 'Evening', value: 'evening' },
    { label: 'Flexible', value: 'flexible' },
  ],
};

const Q3: Question<PrimaryGoal> = {
  emoji: '🎯',
  text: "What's your main goal?",
  options: [
    { label: 'Build Fitness', value: 'fitness' },
    { label: 'Build a Habit', value: 'habit' },
    { label: 'Lose Weight', value: 'weight' },
    { label: 'Find Community', value: 'community' },
  ],
};

const QUESTIONS = [Q1, Q2, Q3] as Question<string>[];

// ─── Component ─────────────────────────────────────────────────────────────────

type Props = OnboardingScreenProps<'Questionnaire'>;

export default function QuestionnaireScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    runFrequency: null,
    preferredTime: null,
    primaryGoal: null,
  });
  const [saving, setSaving] = useState(false);

  const scaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  const question = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;

  const answerKeys: (keyof Answers)[] = ['runFrequency', 'preferredTime', 'primaryGoal'];
  const currentAnswerKey = answerKeys[step];
  const currentAnswer = answers[currentAnswerKey];

  const saveAnswers = async (finalAnswers: Answers) => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;

    console.log('[Questionnaire] Saving answers:', {
      uid,
      runFrequency: finalAnswers.runFrequency,
      preferredTime: finalAnswers.preferredTime,
      primaryGoal: finalAnswers.primaryGoal
    });

    const db = getFirestore();
    await updateDoc(doc(db, 'users', uid), {
      'onboarding.runFrequency': finalAnswers.runFrequency,
      'onboarding.preferredTime': finalAnswers.preferredTime,
      'onboarding.primaryGoal': finalAnswers.primaryGoal,
      'onboarding.completed': true,
      homeCity: 'Surat',
      homeState: 'Gujarat',
      homeTimezone: 'Asia/Kolkata',
    });
  };

  async function handleSelect(value: string) {
    const updated = { ...answers, [currentAnswerKey]: value };
    setAnswers(updated as Answers);

    // Initialize scale animation for this option if not exists
    if (!scaleAnims[value]) {
      scaleAnims[value] = new Animated.Value(1);
    }

    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnims[value], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[value], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (step < totalSteps - 1) {
      // Wait a bit for animation to be visible before moving to next step
      setTimeout(() => setStep((s) => s + 1), 300);
      return;
    }

    // Final step (Q3 selected) — save and proceed
    setSaving(true);
    try {
      await saveAnswers(updated as Answers);
    } catch (error) {
      console.error('[Questionnaire] Save failed:', error);
      // Non-blocking — proceed anyway
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {step > 0 ? (
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      {/* Progress dots */}
      <View style={styles.progressDots}>
        {QUESTIONS.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              idx === step && styles.dotActive,
              idx < step && styles.dotCompleted,
            ]}
          />
        ))}
      </View>

      {/* Question */}
      <View style={styles.body}>
        <Text style={styles.emoji}>{question.emoji}</Text>
        <Text style={styles.questionText}>{question.text}</Text>

        <View style={styles.optionList}>
          {question.options.map((option) => {
            const isSelected = currentAnswer === option.value;

            // Initialize animation value if not exists
            if (!scaleAnims[option.value]) {
              scaleAnims[option.value] = new Animated.Value(1);
            }

            return (
              <Animated.View
                key={option.value}
                style={{ transform: [{ scale: scaleAnims[option.value] }] }}
              >
                <TouchableOpacity
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.9}
                  disabled={saving}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Saving overlay */}
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={Colors.ACCENT} size="large" />
          <Text style={styles.savingText}>Setting up your profile…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontFamily: Typography.fontFamily,
    fontSize: 17,
    color: Colors.SECONDARY_TEXT,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E4E4E7',
  },
  dotActive: {
    backgroundColor: '#E94560',
    width: 24,
  },
  dotCompleted: {
    backgroundColor: '#E94560',
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  emoji: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  questionText: {
    fontFamily: Typography.fontFamily,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.PRIMARY_TEXT,
    marginBottom: Spacing.xl,
    lineHeight: 32,
    textAlign: 'center',
  },
  optionList: {
    gap: Spacing.md,
  },
  optionCard: {
    paddingVertical: 20,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  optionCardSelected: {
    backgroundColor: '#E94560',
  },
  optionText: {
    fontFamily: Typography.fontFamily,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.PRIMARY_TEXT,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  savingText: {
    fontFamily: Typography.fontFamily,
    fontSize: 16,
    color: Colors.SECONDARY_TEXT,
  },
});
