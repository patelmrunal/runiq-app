import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft } from 'phosphor-react-native';
import { serverTimestamp, collection, doc, setDoc, updateDoc, increment } from '@react-native-firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useRunStore } from '../../stores/useRunStore';
import { useUserStore } from '../../stores/useUserStore';
import { COLORS, Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { MainScreenProps } from '../../navigation';

type PostRunSummaryScreenProps = MainScreenProps<'PostRunSummary'>;

const PostRunSummaryScreen: React.FC<PostRunSummaryScreenProps> = ({ navigation }) => {
  const [saving, setSaving] = useState(true);
  const [displayName, setDisplayName] = useState('Runner');
  const { lastSessionData } = useRunStore();
  const { displayName: storedName } = useUserStore();

  useEffect(() => {
    if (storedName) setDisplayName(storedName);
  }, [storedName]);

  useEffect(() => {
    const saveRun = async () => {
      if (!lastSessionData || !auth.currentUser?.uid) {
        setSaving(false);
        return;
      }

      try {
        const uid = auth.currentUser.uid;
        const {
          runId,
          session,
          taskId,
          taskTitle,
          targetKm,
          targetMinutes,
          difficulty,
        } = lastSessionData;

        // Calculate stats
        const durationSeconds = Math.floor(
          (Date.now() - session.startTime - session.pausedDuration) / 1000
        );
        const distanceKm = Number((session.totalDistance / 1000).toFixed(2));
        const avgPaceMinKm = durationSeconds > 0 && distanceKm > 0
          ? Number(((durationSeconds / 60) / distanceKm).toFixed(2))
          : 0;
        const calories = Math.round(distanceKm * 70 * 1.036);

        // Save to Firestore
        const runLogRef = doc(db, `users/${uid}/runLog`, runId);
        await setDoc(runLogRef, {
          runId,
          userId: uid,
          createdAt: serverTimestamp(),
          taskId: taskId || '',
          taskDifficulty: difficulty?.toLowerCase() || 'easy',
          taskTargetKm: targetKm || 0,
          taskTargetMinutes: targetMinutes || 0,
          startTime: session.startTime,
          endTime: Date.now(),
          duration: durationSeconds,
          distance: distanceKm,
          avgPace: avgPaceMinKm,
          calories,
          isManual: false,
          routePolyline: '',
          startCoordHash: '',
          city: 'Surat',
          weather: {
            condition: 'clear',
            tempC: 30,
            wasRaining: false,
          },
          phoneDND: false,
          status: 'pending',
          processedAt: null,
          flagReason: null,
        });

        // Update user stats
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
          runCount: increment(1),
          totalKm: increment(distanceKm),
        });

        // Update Zustand stores
        useUserStore.getState().setUser({
          uid,
          displayName: storedName,
          totalKm: (useUserStore.getState().totalKm || 0) + distanceKm,
        } as any);

        setSaving(false);
      } catch (error) {
        console.error('Error saving run:', error);
        setSaving(false);
      }
    };

    saveRun();
  }, []);

  if (!lastSessionData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Run data not found</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Tabs' as never)}
          >
            <Text style={styles.buttonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { session } = lastSessionData;
  const durationSeconds = Math.floor(
    (Date.now() - session.startTime - session.pausedDuration) / 1000
  );
  const distanceKm = (session.totalDistance / 1000).toFixed(2);
  const durationMin = Math.floor(durationSeconds / 60);
  const durationSec = durationSeconds % 60;
  const avgPaceMinKm = durationSeconds > 0 && Number(distanceKm) > 0
    ? ((durationSeconds / 60) / Number(distanceKm)).toFixed(2)
    : '0.00';
  const calories = Math.round(Number(distanceKm) * 70 * 1.036);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Tabs' as never)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={COLORS.almostBlack} weight="bold" />
        </TouchableOpacity>
      </View>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.savingText}>Saving your run...</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.headerSection}>
          <Text style={styles.celebration}>🎉</Text>
          <Text style={styles.title}>Run Complete!</Text>
        </View>

        <Text style={styles.encouragement}>
          Great run, {displayName}!
        </Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{distanceKm}</Text>
            <Text style={styles.statLabel}>Distance (km)</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {String(durationMin).padStart(2, '0')}:{String(durationSec).padStart(2, '0')}
            </Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgPaceMinKm}</Text>
            <Text style={styles.statLabel}>Avg Pace (min/km)</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{calories}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Tabs' as never)}
      >
        <Text style={styles.buttonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  celebration: {
    fontSize: 60,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.accent,
    fontFamily: Typography.fontFamily,
  },
  encouragement: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.almostBlack,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    fontFamily: Typography.fontFamily,
  },
  statsGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    backgroundColor: COLORS.offWhite,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    width: '48%',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.accent,
    fontFamily: Typography.fontFamily,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.mediumGrey,
    marginTop: Spacing.sm,
    fontFamily: Typography.fontFamily,
  },
  button: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: COLORS.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: Typography.fontFamily,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.mediumGrey,
    marginBottom: Spacing.lg,
    fontFamily: Typography.fontFamily,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  savingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
  },
});

export default PostRunSummaryScreen;
