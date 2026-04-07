import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'phosphor-react-native';
import { serverTimestamp, Timestamp, doc, setDoc, updateDoc, increment } from '@react-native-firebase/firestore';
import { auth, db } from '../../services/firebase';
import { useRunStore } from '../../stores/useRunStore';
import { useUserStore } from '../../stores/useUserStore';
import { COLORS, Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { MainScreenProps } from '../../navigation';

type PostRunSummaryScreenProps = MainScreenProps<'PostRunSummary'>;

interface TaskFeedback {
  taskResult: 'completed' | 'failed' | 'free_run';
  taskCompleted: boolean;
  motivationMessage: string;
  targetKm: number;
  achievedKm: number;
  progressPct: number;
}

const format24HourTime = (millis: number): string => {
  return new Date(millis).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatDate = (millis: number): string => {
  return new Date(millis).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const buildTaskFeedback = (
  taskId: string,
  taskTitle: string,
  targetKm: number,
  achievedKm: number
): TaskFeedback => {
  const safeTargetKm = Number.isFinite(targetKm) ? Math.max(0, targetKm) : 0;
  const safeAchievedKm = Number.isFinite(achievedKm) ? Math.max(0, achievedKm) : 0;
  const isFreeRun = !taskId || taskId === 'free_run' || safeTargetKm <= 0;

  if (isFreeRun) {
    return {
      taskResult: 'free_run',
      taskCompleted: true,
      motivationMessage: 'Nice consistency. Every step compounds into a stronger version of you.',
      targetKm: safeTargetKm,
      achievedKm: safeAchievedKm,
      progressPct: 100,
    };
  }

  const taskCompleted = safeAchievedKm >= safeTargetKm;
  const progressPct = safeTargetKm > 0
    ? Math.min(100, Math.round((safeAchievedKm / safeTargetKm) * 100))
    : 0;

  if (taskCompleted) {
    return {
      taskResult: 'completed',
      taskCompleted: true,
      motivationMessage: `Congrats! You completed ${taskTitle}. Keep this momentum tomorrow.`,
      targetKm: safeTargetKm,
      achievedKm: safeAchievedKm,
      progressPct,
    };
  }

  return {
    taskResult: 'failed',
    taskCompleted: false,
    motivationMessage: 'Not this time, but you still showed up. Recover well and attack the next run.',
    targetKm: safeTargetKm,
    achievedKm: safeAchievedKm,
    progressPct,
  };
};

const buildRoutePath = (coordinates: Array<{ lat: number; lng: number }>): Array<{ latitude: number; longitude: number }> => {
  return coordinates
    .filter((point) => Number.isFinite(point.lat)
      && Number.isFinite(point.lng)
      && Math.abs(point.lat) <= 90
      && Math.abs(point.lng) <= 180)
    .map((point) => ({
      latitude: point.lat,
      longitude: point.lng,
    }));
};

const PostRunSummaryScreen: React.FC<PostRunSummaryScreenProps> = ({ navigation }) => {
  const [saving, setSaving] = useState(true);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [isRunPersisted, setIsRunPersisted] = useState(false);
  const [displayName, setDisplayName] = useState('Runner');
  const hasSavedRef = useRef(false);
  const { lastSessionData } = useRunStore();
  const { displayName: storedName } = useUserStore();

  useEffect(() => {
    if (storedName) setDisplayName(storedName);
  }, [storedName]);

  const computedSummary = useMemo(() => {
    if (!lastSessionData) {
      return null;
    }

    const nowMillis = Date.now();
    const durationSeconds = Math.floor(
      (nowMillis - lastSessionData.session.startTime - lastSessionData.session.pausedDuration) / 1000
    );
    const distanceKm = Number((lastSessionData.session.totalDistance / 1000).toFixed(2));
    const avgPaceMinKm = durationSeconds > 0 && distanceKm > 0
      ? Number(((durationSeconds / 60) / distanceKm).toFixed(2))
      : 0;
    const calories = Math.round(distanceKm * 70 * 1.036);
    const routePath = buildRoutePath(lastSessionData.session.coordinates);
    const feedback = buildTaskFeedback(
      lastSessionData.taskId || '',
      lastSessionData.taskTitle || 'Task',
      Number(lastSessionData.targetKm || 0),
      distanceKm
    );

    return {
      nowMillis,
      durationSeconds,
      distanceKm,
      avgPaceMinKm,
      calories,
      routePath,
      feedback,
    };
  }, [lastSessionData]);

  useEffect(() => {
    const saveRun = async () => {
      if (hasSavedRef.current) return;

      if (!lastSessionData || !auth.currentUser?.uid) {
        setSaving(false);
        return;
      }

      hasSavedRef.current = true;

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

        if (!computedSummary) {
          setIsRunPersisted(false);
          setSaveNotice('Run summary unavailable. This run was not saved.');
          setSaving(false);
          return;
        }

        const {
          nowMillis,
          durationSeconds,
          distanceKm,
          avgPaceMinKm,
          calories,
          routePath,
          feedback,
        } = computedSummary;

        // Skip persistence for empty/instant sessions to avoid rejected writes.
        if (durationSeconds <= 0 || distanceKm <= 0) {
          setIsRunPersisted(false);
          setSaveNotice('Run not saved because no movement was detected. Move a little while running to log it in Recent Runs.');
          setSaving(false);
          return;
        }

        // Save to Firestore
        const runLogRef = doc(db, `users/${uid}/runLog`, runId);
        await setDoc(runLogRef, {
          runId,
          userId: uid,
          createdAt: serverTimestamp(),
          taskId: taskId || '',
          taskTitle: taskTitle || '',
          taskDifficulty: difficulty?.toLowerCase() || 'easy',
          taskTargetKm: targetKm || 0,
          taskTargetMinutes: targetMinutes || 0,
          startTime: Timestamp.fromMillis(session.startTime),
          endTime: Timestamp.fromMillis(nowMillis),
          startTime24h: format24HourTime(session.startTime),
          endTime24h: format24HourTime(nowMillis),
          duration: durationSeconds,
          distance: distanceKm,
          avgPace: avgPaceMinKm,
          calories,
          isManual: false,
          routePolyline: JSON.stringify(routePath),
          routePointCount: routePath.length,
          startCoordHash: '',
          city: 'Surat',
          weather: {
            condition: 'clear',
            tempC: 30,
            wasRaining: false,
          },
          phoneDND: false,
          status: 'pending',
          taskResult: feedback.taskResult,
          taskCompleted: feedback.taskCompleted,
          motivationMessage: feedback.motivationMessage,
          taskProgressPct: feedback.progressPct,
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

        setIsRunPersisted(true);
        setSaveNotice('Run saved successfully. It is now available in Recent Runs.');
        setSaving(false);
      } catch (error) {
        console.error('Error saving run:', error);
        setIsRunPersisted(false);
        setSaveNotice('Could not save this run right now. Check your connection and try again.');
        setSaving(false);
      }
    };

    saveRun();
  }, [lastSessionData, storedName, computedSummary]);

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

  if (!computedSummary) {
    return null;
  }

  const { session, taskId } = lastSessionData;
  const { durationSeconds, distanceKm, avgPaceMinKm, calories, feedback, nowMillis } = computedSummary;
  const distanceKmText = distanceKm.toFixed(2);
  const durationMin = Math.floor(durationSeconds / 60);
  const durationSec = durationSeconds % 60;
  const startTime24 = format24HourTime(session.startTime);
  const endTime24 = format24HourTime(nowMillis);
  const runDate = formatDate(session.startTime);

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

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.celebration}>{feedback.taskCompleted ? '🎉' : '💪'}</Text>
          <Text style={styles.title}>Run Complete!</Text>
        </View>

        <Text style={styles.encouragement}>
          {feedback.taskCompleted
            ? `Great run, ${displayName}!`
            : `Good effort, ${displayName}.`}
        </Text>

        <View style={styles.timeCard}>
          <Text style={styles.timeDate}>{runDate}</Text>
          <Text style={styles.timeRange}>{startTime24} - {endTime24} (24h)</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{distanceKmText}</Text>
            <Text style={styles.statLabel}>Distance (km)</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {String(durationMin).padStart(2, '0')}:{String(durationSec).padStart(2, '0')}
            </Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgPaceMinKm.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Avg Pace (min/km)</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{calories}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>

        <View style={[styles.taskCard, feedback.taskCompleted ? styles.taskCardSuccess : styles.taskCardFail]}>
          <Text style={styles.taskTitle}>Task Result</Text>
          {taskId && taskId !== 'free_run' ? (
            <>
              <Text style={styles.taskStatus}>
                {feedback.taskCompleted ? 'Congrats! Task completed.' : 'You missed the target this time.'}
              </Text>
              <Text style={styles.taskProgress}>
                {feedback.achievedKm.toFixed(2)} / {feedback.targetKm.toFixed(2)} km ({feedback.progressPct}%)
              </Text>
            </>
          ) : (
            <Text style={styles.taskStatus}>Free run complete.</Text>
          )}

          <Text style={styles.taskMessage}>{feedback.motivationMessage}</Text>
        </View>

        {!!saveNotice ? (
          <View style={[styles.saveNoticeCard, isRunPersisted ? styles.saveNoticeSuccess : styles.saveNoticeWarning]}>
            <Text style={styles.saveNoticeText}>{saveNotice}</Text>
          </View>
        ) : null}
      </ScrollView>

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
  },
  contentContainer: {
    paddingBottom: Spacing.md,
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
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily,
  },
  timeCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timeDate: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
  },
  timeRange: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    backgroundColor: COLORS.offWhite,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    width: '47%',
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
  taskCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  taskCardSuccess: {
    backgroundColor: '#ECFDF5',
  },
  taskCardFail: {
    backgroundColor: '#FFF1F2',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
    marginBottom: 4,
  },
  taskStatus: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
    fontFamily: Typography.fontFamily,
  },
  taskProgress: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
  },
  taskMessage: {
    marginTop: Spacing.sm,
    fontSize: 14,
    color: COLORS.mediumGrey,
    lineHeight: 20,
    fontFamily: Typography.fontFamily,
  },
  saveNoticeCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  saveNoticeSuccess: {
    backgroundColor: '#ECFDF5',
  },
  saveNoticeWarning: {
    backgroundColor: '#FEF3C7',
  },
  saveNoticeText: {
    fontSize: 13,
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
    lineHeight: 19,
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
