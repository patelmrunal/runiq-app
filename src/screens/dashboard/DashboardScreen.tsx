import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useUserStore } from '../../stores/useUserStore';
import type { TabScreenProps } from '../../navigation';
import { COLORS, SPACING } from '../../constants/theme';

type Props = TabScreenProps<'Dashboard'>;

export default function DashboardScreen({}: Props) {
  const [loading, setLoading] = useState(true);
  const { displayName, currentStreak, level, tier } = useUserStore();

  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }

    // Real-time listener for user document
    const unsubscribe = firestore()
      .collection('users')
      .doc(uid)
      .onSnapshot(
        (doc) => {
          const data = doc.data();
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {getGreeting()}, {displayName || 'Runner'}
          </Text>

          {/* Tier badge */}
          <View style={[styles.tierBadge, tier === 'premium' && styles.tierBadgePremium]}>
            <Text style={[styles.tierBadgeText, tier === 'premium' && styles.tierBadgeTextPremium]}>
              {tier === 'premium' ? 'Premium' : 'Basic'}
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {/* Streak */}
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current Streak</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.flameIcon}>🔥</Text>
              <Text style={styles.statValue}>{currentStreak}</Text>
            </View>
          </View>

          {/* Level */}
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={styles.statValue}>{level}</Text>
            <Text style={styles.statSubtext}>Starter</Text>
          </View>
        </View>

        {/* Daily tasks section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>

          {/* Task placeholders */}
          {[1, 2, 3].map((idx) => (
            <View key={idx} style={styles.taskCard}>
              <View style={styles.taskIcon}>
                <Text style={styles.taskIconText}>📋</Text>
              </View>
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>Tasks loading...</Text>
                <Text style={styles.taskDescription}>
                  Daily tasks will appear here
                </Text>
              </View>
            </View>
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
    paddingBottom: SPACING.xxl,
  },
  header: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: 'Inter',
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.almostBlack,
    flex: 1,
  },
  tierBadge: {
    backgroundColor: COLORS.offWhite,
    borderRadius: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tierBadgePremium: {
    backgroundColor: '#FFF1F3',
    borderColor: COLORS.accent,
  },
  tierBadgeText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.mediumGrey,
  },
  tierBadgeTextPremium: {
    color: COLORS.accent,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: COLORS.mediumGrey,
    marginBottom: SPACING.xs,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  flameIcon: {
    fontSize: 24,
  },
  statValue: {
    fontFamily: 'Inter',
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.almostBlack,
  },
  statSubtext: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: COLORS.lightGrey,
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.almostBlack,
    marginBottom: SPACING.md,
  },
  taskCard: {
    backgroundColor: COLORS.offWhite,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  taskIconText: {
    fontSize: 20,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.almostBlack,
    marginBottom: 2,
  },
  taskDescription: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: COLORS.mediumGrey,
  },
});
