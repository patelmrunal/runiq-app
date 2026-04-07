import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignOut } from 'phosphor-react-native';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { doc, onSnapshot, query, collection, orderBy, limit } from '@react-native-firebase/firestore';
import { auth, db } from '../../services/firebase';
import { logout } from '../../services/firebase/auth';
import { useUserStore } from '../../stores/useUserStore';
import type { TabScreenProps } from '../../navigation';
import { COLORS, SPACING } from '../../constants/theme';

type Props = TabScreenProps<'Profile'>;
type TaskResult = 'completed' | 'failed' | 'free_run';

const TASK_COMPLETION_EPSILON_KM = 0.005;

interface RunItem {
  runId: string;
  createdAt: any;
  startTime: any;
  endTime: any;
  distance: number;
  duration: number;
  avgPace: number;
  taskId: string;
  taskResult: TaskResult;
  taskCompleted: boolean;
  motivationMessage: string;
  taskTargetKm: number;
  taskProgressPct: number;
}

interface DerivedRunOutcome {
  hasTaskGoal: boolean;
  completed: boolean;
  result: TaskResult;
  label: string;
  color: string;
  progressPct: number;
  message: string;
}

const toMillis = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const maybeTimestamp = value as { toDate?: () => Date } | null;
  if (maybeTimestamp?.toDate) {
    return maybeTimestamp.toDate().getTime();
  }

  return null;
};

const formatRunDate = (value: unknown): string => {
  const millis = toMillis(value);
  if (!millis) return 'N/A';

  return new Date(millis).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const format24Hour = (value: unknown): string => {
  const millis = toMillis(value);
  if (!millis) return '--:--';

  return new Date(millis).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const deriveRunOutcome = (run: RunItem): DerivedRunOutcome => {
  const targetKm = Number.isFinite(run.taskTargetKm) ? Math.max(0, run.taskTargetKm) : 0;
  const hasTaskGoal = Boolean(run.taskId && run.taskId !== 'free_run' && targetKm > 0);

  if (!hasTaskGoal) {
    return {
      hasTaskGoal: false,
      completed: true,
      result: 'free_run',
      label: 'Free run',
      color: '#2563EB',
      progressPct: 100,
      message: run.motivationMessage,
    };
  }

  const completed = run.distance + TASK_COMPLETION_EPSILON_KM >= targetKm;
  const progressPct = Math.min(100, Math.round((run.distance / targetKm) * 100));

  return {
    hasTaskGoal: true,
    completed,
    result: completed ? 'completed' : 'failed',
    label: completed ? 'Task completed' : 'Task not completed',
    color: completed ? '#10B981' : '#E94560',
    progressPct,
    message: run.motivationMessage || (completed
      ? 'Great job. You hit your target for this run.'
      : 'You are close. Keep showing up and finish strong next run.'),
  };
};

export default function ProfileScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [recentRuns, setRecentRuns] = useState<RunItem[]>([]);
  const {
    username,
    displayName,
    photoURL,
    dnaType,
    tier,
    totalKm,
    currentStreak,
    longestStreak,
  } = useUserStore();

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    // Real-time listener for user document
    const userRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        const data = docSnap.data();
        if (data) {
          useUserStore.getState().setUser({
            uid: data?.uid || '',
            email: data?.email || '',
            username: data?.username || '',
            displayName: data?.displayName || '',
            photoURL: data?.photoURL || null,
            tier: data?.tier || 'basic',
            level: data?.level || 1,
            currentStreak: data?.currentStreak || 0,
            longestStreak: data?.longestStreak || 0,
            shieldsAvailable: data?.shieldsAvailable || 0,
            dnaType: data?.dnaType || null,
            totalKm: data?.totalKm || 0,
            homeCity: data?.homeCity || '',
            homeTimezone: data?.homeTimezone || '',
            restDay: data?.restDay || 0,
            totalRuns: data?.totalRuns || 0,
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('[Profile] Firestore listener error:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Load recent runs
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const runLogQuery = query(
      collection(db, `users/${uid}/runLog`),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      runLogQuery,
      (snapshot) => {
        const runs: RunItem[] = [];
        snapshot.docs.forEach((docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>) => {
          const data = docSnap.data();
          runs.push({
            runId: docSnap.id,
            createdAt: data.createdAt,
            startTime: data.startTime,
            endTime: data.endTime,
            distance: data.distance || 0,
            duration: data.duration || 0,
            avgPace: data.avgPace || 0,
            taskId: typeof data.taskId === 'string' ? data.taskId : '',
            taskResult: (data.taskResult as RunItem['taskResult']) || 'free_run',
            taskCompleted: Boolean(data.taskCompleted),
            motivationMessage: typeof data.motivationMessage === 'string' ? data.motivationMessage : '',
            taskTargetKm: Number(data.taskTargetKm || 0),
            taskProgressPct: Number(data.taskProgressPct || 0),
          });
        });
        setRecentRuns(runs);
      },
      (error) => {
        console.error('[Profile] Error loading runs:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error('[Profile] Logout failed:', error);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const totalRuns = useUserStore.getState().totalRuns || 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with logout */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <SignOut size={24} color="#71717A" weight="regular" />
          </TouchableOpacity>
        </View>

        {/* Avatar section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {(displayName || username || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Name and tier badge */}
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{displayName || 'Runner'}</Text>
            <View style={[styles.tierBadge, tier === 'premium' && styles.tierBadgePremium]}>
              <Text style={[styles.tierText, tier === 'premium' && styles.tierTextPremium]}>
                {tier === 'premium' ? 'Premium' : 'Basic'}
              </Text>
            </View>
          </View>

          {/* Username */}
          <Text style={styles.username}>@{username || 'runner'}</Text>

          {/* DNA type */}
          <Text style={styles.dnaType}>
            DNA Type: {dnaType || 'Still Discovering'}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalKm.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Total KM</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalRuns}</Text>
            <Text style={styles.statLabel}>Total Runs</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statValueRow}>
              <Text style={styles.flameEmoji}>🔥</Text>
              <Text style={styles.statValue}>{currentStreak}</Text>
            </View>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* Additional info section */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Longest Streak</Text>
            <Text style={styles.infoValue}>{longestStreak} days</Text>
          </View>
        </View>

        {/* Recent Runs section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Runs</Text>
          {recentRuns.length === 0 ? (
            <View style={styles.emptyRuns}>
              <Text style={styles.emptyRunsText}>No runs yet. Start your first run!</Text>
            </View>
          ) : (
            recentRuns.map((run) => {
              const runDate = formatRunDate(run.startTime || run.createdAt);
              const startTime24 = format24Hour(run.startTime);
              const endTime24 = format24Hour(run.endTime);
              const outcome = deriveRunOutcome(run);

              const durationMin = Math.floor(run.duration / 60);
              const durationSec = run.duration % 60;

              return (
                <TouchableOpacity
                  key={run.runId}
                  style={styles.runCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    const parentNav = navigation.getParent();
                    if (parentNav) {
                      (parentNav as any).navigate('RunDetail', { runId: run.runId });
                    }
                  }}
                >
                  <View style={styles.runHeader}>
                    <Text style={styles.runDate}>{runDate}</Text>
                    <Text style={styles.runDistance}>{run.distance.toFixed(1)} km</Text>
                  </View>
                  <View style={styles.runFooter}>
                    <Text style={styles.runDuration}>
                      {String(durationMin).padStart(2, '0')}:{String(durationSec).padStart(2, '0')}
                    </Text>
                    <Text style={styles.runPace}>{run.avgPace.toFixed(2)} min/km</Text>
                  </View>
                  <Text style={styles.runTimeRange}>{startTime24} - {endTime24} (24h)</Text>
                  <View style={styles.runStatusRow}>
                    <View style={[styles.runStatusBadge, { backgroundColor: `${outcome.color}20` }]}> 
                      <Text style={[styles.runStatusText, { color: outcome.color }]}>{outcome.label}</Text>
                    </View>
                    {outcome.hasTaskGoal ? (
                      <Text style={styles.progressText}>{run.distance.toFixed(2)} / {run.taskTargetKm.toFixed(2)} km ({outcome.progressPct}%)</Text>
                    ) : null}
                  </View>
                  {!!outcome.message ? (
                    <Text numberOfLines={2} style={styles.runLogText}>{outcome.message}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.almostBlack,
  },
  logoutButton: {
    padding: 8,
  },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#E94560',
    padding: 4,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontFamily: 'Inter',
    fontSize: 40,
    fontWeight: '700',
    color: '#E94560',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  displayName: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.almostBlack,
  },
  username: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: COLORS.mediumGrey,
    marginBottom: 4,
  },
  tierBadge: {
    backgroundColor: '#F4F4F5',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tierBadgePremium: {
    backgroundColor: '#FFF1F3',
  },
  tierText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.mediumGrey,
  },
  tierTextPremium: {
    color: '#E94560',
  },
  dnaType: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: COLORS.mediumGrey,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flameEmoji: {
    fontSize: 20,
  },
  statValue: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.almostBlack,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: COLORS.mediumGrey,
    textAlign: 'center',
  },

  // Additional info
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.almostBlack,
    marginBottom: SPACING.md,
  },
  infoCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  infoLabel: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.almostBlack,
  },
  infoValue: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: COLORS.mediumGrey,
  },
  emptyRuns: {
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyRunsText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: COLORS.mediumGrey,
    textAlign: 'center',
  },
  runCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  runDate: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.almostBlack,
  },
  runDistance: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  runFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runDuration: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: COLORS.mediumGrey,
  },
  runPace: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: COLORS.mediumGrey,
  },
  runTimeRange: {
    marginTop: 8,
    fontFamily: 'Inter',
    fontSize: 12,
    color: COLORS.mediumGrey,
  },
  runStatusRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  runStatusText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
  },
  progressText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: COLORS.mediumGrey,
  },
  runLogText: {
    marginTop: 8,
    fontFamily: 'Inter',
    fontSize: 12,
    color: COLORS.mediumGrey,
    lineHeight: 18,
  },
});
