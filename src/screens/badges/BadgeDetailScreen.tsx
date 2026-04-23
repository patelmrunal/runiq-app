import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'phosphor-react-native';
import { doc, getDoc } from '@react-native-firebase/firestore';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import type { MainScreenProps } from '../../navigation';
import { auth, db } from '../../services/firebase';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';

type Props = MainScreenProps<'BadgeDetail'>;

type BadgeRecord = {
  badgeId: string;
  name: string;
  description: string;
  category: string;
  milestone: boolean;
  isPremiumOnly: boolean;
  earnedAt: unknown;
  triggerRunId: string | null;
  conditionText: string;
  source: 'earned' | 'catalog';
};

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  distance: { label: 'Distance', emoji: '📏' },
  streak: { label: 'Streak', emoji: '🔥' },
  time_of_day: { label: 'Time of Day', emoji: '🕒' },
  weather: { label: 'Weather', emoji: '🌧️' },
  behaviour: { label: 'Behaviour', emoji: '⚡' },
  seasonal: { label: 'Seasonal', emoji: '🎉' },
  mission: { label: 'Mission', emoji: '🧭' },
};

const getTimestampMillis = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const maybeTs = value as { toDate?: () => Date } | null;
  if (maybeTs?.toDate) {
    return maybeTs.toDate().getTime();
  }

  return null;
};

const formatDateTime = (value: unknown): string => {
  const millis = getTimestampMillis(value);
  if (!millis) return 'Not earned yet';

  return new Date(millis).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getConditionSummary = (condition: unknown): string => {
  const rawCondition = typeof condition === 'object' && condition ? condition as Record<string, unknown> : {};
  const type = typeof rawCondition.type === 'string' ? rawCondition.type : '';
  const threshold = Number(rawCondition.threshold || 0);

  switch (type) {
    case 'run_count':
      return `Complete ${threshold} run${threshold === 1 ? '' : 's'}.`;
    case 'total_km':
      return `Reach ${threshold} km total running distance.`;
    case 'current_streak':
      return `Maintain a ${threshold}-day run streak.`;
    case 'hard_task_completions':
      return `Complete ${threshold} hard tasks.`;
    case 'run_time_window': {
      const beforeHour = Number(rawCondition.beforeHour);
      const afterHour = Number(rawCondition.afterHour);
      if (Number.isFinite(beforeHour)) {
        return `Start a run before ${beforeHour}:00.`;
      }
      if (Number.isFinite(afterHour)) {
        return `Start a run at or after ${afterHour}:00.`;
      }
      return 'Complete runs in the required time window.';
    }
    case 'weekend_run':
      return 'Complete a run on a weekend.';
    case 'raining_run':
      return 'Complete a run while it is raining.';
    default:
      return 'Keep running consistently to unlock this badge.';
  }
};

const getBadgeDetailsFromDefinitions = (
  definitions: FirebaseFirestoreTypes.DocumentData[],
  badgeId: string
) => {
  const fallback = definitions.find((item: FirebaseFirestoreTypes.DocumentData) => item?.id === badgeId);
  if (!fallback) return null;

  return {
    name: typeof fallback.name === 'string' && fallback.name ? fallback.name : badgeId,
    description: typeof fallback.description === 'string' ? fallback.description : 'Keep running to unlock this badge.',
    category: typeof fallback.category === 'string' && fallback.category ? fallback.category : 'distance',
    milestone: fallback.milestone === true,
    isPremiumOnly: fallback.isPremiumOnly === true,
    conditionText: getConditionSummary(fallback.condition),
  };
};

export default function BadgeDetailScreen({ navigation, route }: Props) {
  const { badgeId } = route.params;
  const [loading, setLoading] = useState(true);
  const [badge, setBadge] = useState<BadgeRecord | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    const loadBadge = async () => {
      try {
        const configSnap = await getDoc(doc(db, 'config', 'badgeDefinitions'));
        const definitions = Array.isArray(configSnap.data()?.badges)
          ? configSnap.data()?.badges
          : [];
        const definitionDetails = getBadgeDetailsFromDefinitions(definitions, badgeId);

        const badgeRef = doc(db, `users/${uid}/badges/${badgeId}`);
        const badgeSnap = await getDoc(badgeRef);

        if (badgeSnap.exists()) {
          const data = badgeSnap.data() || {};
          setBadge({
            badgeId: typeof data.badgeId === 'string' && data.badgeId ? data.badgeId : badgeId,
            name: typeof data.name === 'string' && data.name ? data.name : (definitionDetails?.name || badgeId),
            description: typeof data.description === 'string' && data.description
              ? data.description
              : (definitionDetails?.description || 'Badge unlocked by your running consistency.'),
            category: typeof data.category === 'string' && data.category
              ? data.category
              : (definitionDetails?.category || 'distance'),
            milestone: data.milestone === true || definitionDetails?.milestone === true,
            isPremiumOnly: data.isPremiumOnly === true || definitionDetails?.isPremiumOnly === true,
            earnedAt: data.earnedAt,
            triggerRunId: typeof data.triggerRunId === 'string' ? data.triggerRunId : null,
            conditionText: definitionDetails?.conditionText || 'Keep running consistently to unlock related milestones.',
            source: 'earned',
          });
          return;
        }

        if (definitionDetails) {
          setBadge({
            badgeId,
            name: definitionDetails.name,
            description: definitionDetails.description,
            category: definitionDetails.category,
            milestone: definitionDetails.milestone,
            isPremiumOnly: definitionDetails.isPremiumOnly,
            earnedAt: null,
            triggerRunId: null,
            conditionText: definitionDetails.conditionText,
            source: 'catalog',
          });
        }
      } catch (error) {
        console.error('[BadgeDetail] Failed to load badge:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBadge().catch((error) => {
      console.error('[BadgeDetail] Load promise failed:', error);
      setLoading(false);
    });
  }, [badgeId]);

  const categoryMeta = useMemo(() => {
    if (!badge) return CATEGORY_META.distance;
    return CATEGORY_META[badge.category] || { label: badge.category, emoji: '🏅' };
  }, [badge]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!badge) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
            <ArrowLeft size={20} color={COLORS.almostBlack} weight="bold" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Badge Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.missingCard}>
          <Text style={styles.missingTitle}>Badge not found</Text>
          <Text style={styles.missingSubtitle}>This badge may not be available for your current account.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backButton}>
            <ArrowLeft size={20} color={COLORS.almostBlack} weight="bold" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Badge Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.heroCard, badge.milestone && styles.heroCardMilestone]}>
          <Text style={styles.heroEmoji}>{categoryMeta.emoji}</Text>
          <Text style={styles.heroName}>{badge.name}</Text>
          <Text style={styles.heroDescription}>{badge.description}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{categoryMeta.label}</Text>
          </View>
          {badge.milestone ? (
            <View style={[styles.metaChip, styles.milestoneChip]}>
              <Text style={[styles.metaChipText, styles.milestoneChipText]}>Milestone</Text>
            </View>
          ) : null}
          {badge.isPremiumOnly ? (
            <View style={[styles.metaChip, styles.premiumChip]}>
              <Text style={[styles.metaChipText, styles.premiumChipText]}>Premium</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Badge ID</Text>
          <Text style={styles.infoValue}>{badge.badgeId}</Text>

          <Text style={styles.infoLabel}>Status</Text>
          <Text style={styles.infoValue}>{badge.source === 'earned' ? 'Unlocked' : 'Locked'}</Text>

          <Text style={styles.infoLabel}>Earned At</Text>
          <Text style={styles.infoValue}>{formatDateTime(badge.earnedAt)}</Text>

          <Text style={styles.infoLabel}>Trigger Run ID</Text>
          <Text style={styles.infoValue}>{badge.triggerRunId || 'No trigger run recorded yet'}</Text>

          <Text style={styles.infoLabel}>Unlock Criteria</Text>
          <Text style={styles.infoValue}>{badge.conditionText}</Text>

          {badge.source === 'earned' && badge.triggerRunId ? (
            <>
              <Text style={styles.infoLabel}>Trigger Run</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('RunDetail', { runId: badge.triggerRunId as string })}
                activeOpacity={0.8}
                style={styles.runButton}
              >
                <Text style={styles.runButtonText}>Open Run {badge.triggerRunId}</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <Text style={styles.infoLabel}>Data Source</Text>
          <Text style={styles.infoValue}>{badge.source === 'earned' ? 'Earned badge record' : 'Badge catalog definition'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.almostBlack,
  },
  headerSpacer: {
    width: 36,
    height: 36,
  },
  heroCard: {
    marginTop: SPACING.sm,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    ...SHADOWS.subtle,
  },
  heroCardMilestone: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  heroEmoji: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  heroName: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.almostBlack,
    textAlign: 'center',
  },
  heroDescription: {
    marginTop: SPACING.sm,
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.mediumGrey,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metaChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F4F4F5',
  },
  metaChipText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mediumGrey,
  },
  milestoneChip: {
    backgroundColor: '#FFEDD5',
  },
  milestoneChipText: {
    color: '#B45309',
  },
  premiumChip: {
    backgroundColor: '#FFF1F2',
  },
  premiumChipText: {
    color: COLORS.accent,
  },
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    ...SHADOWS.subtle,
  },
  infoLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mediumGrey,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
    marginTop: SPACING.sm,
  },
  infoValue: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: COLORS.almostBlack,
  },
  runButton: {
    marginTop: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  runButtonText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.deepBlue,
  },
  missingCard: {
    marginTop: SPACING.xl,
    marginHorizontal: SPACING.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    backgroundColor: '#FAFAFA',
  },
  missingTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.almostBlack,
  },
  missingSubtitle: {
    marginTop: SPACING.sm,
    fontFamily: 'Inter',
    fontSize: 14,
    color: COLORS.mediumGrey,
  },
});
