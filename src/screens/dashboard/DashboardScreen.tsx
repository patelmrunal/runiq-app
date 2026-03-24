import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { CaretRight } from 'phosphor-react-native';
import { doc, onSnapshot } from '@react-native-firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useUserStore } from '../../stores/useUserStore';
import type { TabScreenProps } from '../../navigation';
import { COLORS, SPACING } from '../../constants/theme';

type Props = TabScreenProps<'Dashboard'>;

// ─── Demo tasks (hardcoded for Phase 1) ───────────────────────────────────────

const DEMO_TASKS = [
  { id: '1', title: 'Morning 2K', difficulty: 'Easy', targetKm: 2, targetMin: 15 },
  { id: '2', title: 'Steady 5K', difficulty: 'Medium', targetKm: 5, targetMin: 35 },
  { id: '3', title: 'Speed 3K', difficulty: 'Hard', targetKm: 3, targetMin: 18 },
];

const DIFFICULTY_COLORS = {
  Easy: '#10B981',
  Medium: '#F59E0B',
  Hard: '#E94560',
};

export default function DashboardScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const { displayName, currentStreak, level, tier } = useUserStore();

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
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('[Dashboard] Firestore listener error:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Calculate greeting based on time
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient card */}
        <LinearGradient
          colors={['#E94560', '#FF6B6B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.greeting}>
            {getGreeting()}, {displayName || 'Runner'}
          </Text>

          {/* Streak section */}
          <View style={styles.streakSection}>
            <Text style={styles.streakLabel}>Current Streak</Text>
            <View style={styles.streakRow}>
              <Text style={styles.flameEmoji}>🔥</Text>
              <Text style={styles.streakValue}>{currentStreak}</Text>
            </View>
          </View>

          {/* Level badge */}
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>Level {level}</Text>
          </View>
        </LinearGradient>

        {/* Today's Tasks section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>

          {DEMO_TASKS.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              activeOpacity={0.7}
              onPress={() => {
                // Navigate to RunTracking in the parent MainStack
                const parentNav = navigation.getParent();
                if (parentNav) {
                  parentNav.navigate('RunTracking', {
                    taskId: task.id,
                    taskTitle: task.title,
                    targetKm: task.targetKm,
                    targetMinutes: task.targetMin,
                    difficulty: task.difficulty as 'Easy' | 'Medium' | 'Hard',
                  });
                }
              }}
            >
              {/* Left colored bar */}
              <View
                style={[
                  styles.taskBar,
                  { backgroundColor: DIFFICULTY_COLORS[task.difficulty as keyof typeof DIFFICULTY_COLORS] },
                ]}
              />

              <View style={styles.taskContent}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <View style={[
                    styles.difficultyBadge,
                    { backgroundColor: DIFFICULTY_COLORS[task.difficulty as keyof typeof DIFFICULTY_COLORS] }
                  ]}>
                    <Text style={styles.difficultyBadgeText}>{task.difficulty}</Text>
                  </View>
                  <CaretRight size={20} color="#71717A" weight="bold" />
                </View>
                <Text style={styles.taskDescription}>
                  {task.targetKm}km • {task.targetMin} minutes
                </Text>
              </View>
            </TouchableOpacity>
          ))}
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },

  // Hero card
  heroCard: {
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  greeting: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: SPACING.lg,
  },
  streakSection: {
    marginBottom: SPACING.md,
  },
  streakLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 8,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flameEmoji: {
    fontSize: 32,
  },
  streakValue: {
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  levelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  levelBadgeText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Tasks section
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.almostBlack,
    marginBottom: SPACING.md,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  taskBar: {
    width: 4,
  },
  taskContent: {
    flex: 1,
    padding: SPACING.md,
    paddingLeft: SPACING.md + 4,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  taskTitle: {
    fontFamily: 'Inter',
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.almostBlack,
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  difficultyBadgeText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  taskDescription: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: COLORS.mediumGrey,
  },
});
