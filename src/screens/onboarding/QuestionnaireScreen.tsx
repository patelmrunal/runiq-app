import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import firestore, { serverTimestamp } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
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
  text: string;
  options: { label: string; value: T }[];
}

// ─── Questions config ──────────────────────────────────────────────────────────

const Q1: Question<RunFrequency> = {
  text: 'How often do you run currently?',
  options: [
    { label: 'Never', value: 'never' },
    { label: 'Sometimes', value: 'sometimes' },
    { label: 'Regularly', value: 'regularly' },
  ],
};

const Q2: Question<PreferredTime> = {
  text: 'When do you prefer to run?',
  options: [
    { label: 'Morning', value: 'morning' },
    { label: 'Evening', value: 'evening' },
    { label: 'Flexible', value: 'flexible' },
  ],
};

const Q3: Question<PrimaryGoal> = {
  text: "What's your main goal?",
  options: [
    { label: 'Get fit', value: 'fitness' },
    { label: 'Build a habit', value: 'habit' },
    { label: 'Lose weight', value: 'weight' },
    { label: 'Meet other runners', value: 'community' },
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

  const question = QUESTIONS[step];
  const totalSteps = QUESTIONS.length;

  const answerKeys: (keyof Answers)[] = ['runFrequency', 'preferredTime', 'primaryGoal'];
  const currentAnswerKey = answerKeys[step];
  const currentAnswer = answers[currentAnswerKey];

  async function handleSelect(value: string) {
    const updated = { ...answers, [currentAnswerKey]: value };
    setAnswers(updated as Answers);

    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }

    // Final step — save and proceed
    setSaving(true);
    try {
      const uid = auth().currentUser?.uid;
      if (uid) {
        await firestore()
          .collection('users')
          .doc(uid)
          .update({
            'onboarding.runFrequency': updated.runFrequency,
            'onboarding.preferredTime': updated.preferredTime,
            'onboarding.primaryGoal': updated.primaryGoal,
            'onboarding.completedAt': serverTimestamp(),
          });
      }
    } catch {
      // Non-blocking — proceed to app even if write fails
    } finally {
      setSaving(false);
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'Main' as never }] }),
      );
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

        <Text style={styles.progressLabel}>
          {step + 1}/{totalSteps}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / totalSteps) * 100}%` }]} />
      </View>

      {/* Question */}
      <View style={styles.body}>
        <Text style={styles.questionText}>{question.text}</Text>

        <View style={styles.optionList}>
          {question.options.map((option) => {
            const isSelected = currentAnswer === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleSelect(option.value)}
                activeOpacity={0.75}
                disabled={saving}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.label}
                </Text>

                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Saving overlay */}
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color={Colors.ACCENT} size="small" />
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
    backgroundColor: Colors.PRIMARY_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  progressLabel: {
    fontFamily: Typography.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.SECONDARY_TEXT,
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.BORDER,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.ACCENT,
    borderRadius: BorderRadius.full,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  questionText: {
    fontFamily: Typography.fontFamily,
    ...Typography.screenTitle,
    color: Colors.PRIMARY_TEXT,
    marginBottom: Spacing.xl,
    lineHeight: 34,
  },
  optionList: {
    gap: Spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.PRIMARY_BG,
  },
  optionCardSelected: {
    borderColor: Colors.ACCENT,
    backgroundColor: '#FFF1F3',
  },
  optionText: {
    fontFamily: Typography.fontFamily,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.PRIMARY_TEXT,
  },
  optionTextSelected: {
    color: Colors.ACCENT,
    fontWeight: '600',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.ACCENT,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.ACCENT,
  },
  savingOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  savingText: {
    fontFamily: Typography.fontFamily,
    ...Typography.body,
    color: Colors.SECONDARY_TEXT,
  },
});
