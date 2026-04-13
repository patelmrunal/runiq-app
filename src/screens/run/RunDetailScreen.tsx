import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowLeft } from 'phosphor-react-native';
import { doc, getDoc } from '@react-native-firebase/firestore';
import { auth, db } from '../../services/firebase';
import { COLORS, Typography, Spacing, BorderRadius } from '../../constants/theme';
import type { MainScreenProps } from '../../navigation';

type RunDetailScreenProps = MainScreenProps<'RunDetail'>;
type TaskResult = 'completed' | 'failed' | 'free_run';

const TASK_COMPLETION_EPSILON_KM = 0.005;

interface RoutePoint {
  latitude: number;
  longitude: number;
}

interface RunDetailData {
  runId: string;
  createdAt?: any;
  startTime?: any;
  endTime?: any;
  status?: string;
  flagReason?: string | null;
  duration: number;
  distance: number;
  avgPace: number;
  calories: number;
  taskId?: string;
  taskTargetKm?: number;
  taskResult?: TaskResult;
  taskCompleted?: boolean;
  motivationMessage?: string;
  taskProgressPct?: number;
  routePolyline?: string;
}

interface TaskEvaluation {
  hasTaskGoal: boolean;
  completed: boolean;
  result: TaskResult;
  targetKm: number;
  achievedKm: number;
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

const formatDate = (value: unknown): string => {
  const millis = toMillis(value);
  if (!millis) return 'N/A';

  return new Date(millis).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const format24HourTime = (value: unknown): string => {
  const millis = toMillis(value);
  if (!millis) return '--:--';

  return new Date(millis).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const parseRoutePoints = (raw: unknown): RoutePoint[] => {
  if (typeof raw !== 'string' || !raw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((point) => {
        const lat = Number(point?.latitude ?? point?.lat);
        const lng = Number(point?.longitude ?? point?.lng);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          return null;
        }

        return {
          latitude: lat,
          longitude: lng,
        };
      })
      .filter((point): point is RoutePoint => point !== null);
  } catch {
    return [];
  }
};

const getFlagReviewDetails = (flagReason: string | null) => {
  const reason = typeof flagReason === 'string' ? flagReason : '';

  if (reason === 'sparse_gps') {
    return {
      label: 'GPS review needed',
      message: 'GPS trace was sparse in this run, so progression updates were not fully applied.',
      code: 'sparse_gps',
    };
  }

  if (reason === 'impossible_pace') {
    return {
      label: 'Pace review needed',
      message: 'Recorded pace was faster than human running range, so this run is under review.',
      code: 'impossible_pace',
    };
  }

  if (reason === 'invalid_run_payload') {
    return {
      label: 'Run data incomplete',
      message: 'Run payload was incomplete, so this run is under review.',
      code: 'invalid_run_payload',
    };
  }

  return {
    label: 'Review needed',
    message: 'This run is under review due to data quality checks.',
    code: reason || 'unknown',
  };
};

const deriveTaskEvaluation = (runData: RunDetailData | null): TaskEvaluation => {
  if (!runData) {
    return {
      hasTaskGoal: false,
      completed: true,
      result: 'free_run',
      targetKm: 0,
      achievedKm: 0,
      progressPct: 100,
      message: 'Nice consistency. Every step compounds into a stronger version of you.',
    };
  }

  const achievedKm = Number.isFinite(runData.distance) ? Math.max(0, runData.distance) : 0;
  const targetKm = Number.isFinite(runData.taskTargetKm) ? Math.max(0, Number(runData.taskTargetKm)) : 0;
  const hasTaskGoal = Boolean(runData.taskId && runData.taskId !== 'free_run' && targetKm > 0);

  if (!hasTaskGoal) {
    return {
      hasTaskGoal: false,
      completed: true,
      result: 'free_run',
      targetKm,
      achievedKm,
      progressPct: 100,
      message: runData.motivationMessage || 'Nice consistency. Every step compounds into a stronger version of you.',
    };
  }

  const completed = achievedKm + TASK_COMPLETION_EPSILON_KM >= targetKm;
  const progressPct = Math.min(100, Math.round((achievedKm / targetKm) * 100));

  return {
    hasTaskGoal: true,
    completed,
    result: completed ? 'completed' : 'failed',
    targetKm,
    achievedKm,
    progressPct,
    message: runData.motivationMessage || (completed
      ? 'Congrats! You completed your target. Keep this momentum for the next run.'
      : 'Not this time, but you showed up. Recover, reset, and go again.'),
  };
};

const RunDetailScreen: React.FC<RunDetailScreenProps> = ({ navigation, route }) => {
  const { runId } = route.params;

  const [loading, setLoading] = useState(true);
  const [runData, setRunData] = useState<RunDetailData | null>(null);

  useEffect(() => {
    const loadRun = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const runRef = doc(db, `users/${uid}/runLog`, runId);
        const snap = await getDoc(runRef);

        if (!snap.exists()) {
          setRunData(null);
          setLoading(false);
          return;
        }

        const data = snap.data() || {};

        setRunData({
          runId: snap.id,
          createdAt: data.createdAt,
          startTime: data.startTime,
          endTime: data.endTime,
          status: typeof data.status === 'string' ? data.status : 'pending',
          flagReason: typeof data.flagReason === 'string' ? data.flagReason : null,
          duration: Number(data.duration || 0),
          distance: Number(data.distance || 0),
          avgPace: Number(data.avgPace || 0),
          calories: Number(data.calories || 0),
          taskId: typeof data.taskId === 'string' ? data.taskId : '',
          taskTargetKm: Number(data.taskTargetKm || 0),
          taskResult: data.taskResult as TaskResult | undefined,
          taskCompleted: typeof data.taskCompleted === 'boolean' ? data.taskCompleted : undefined,
          motivationMessage: typeof data.motivationMessage === 'string' ? data.motivationMessage : '',
          taskProgressPct: Number.isFinite(Number(data.taskProgressPct))
            ? Number(data.taskProgressPct)
            : undefined,
          routePolyline: typeof data.routePolyline === 'string' ? data.routePolyline : '',
        });
      } catch (error) {
        console.error('[RunDetail] Failed to load run:', error);
        setRunData(null);
      } finally {
        setLoading(false);
      }
    };

    loadRun();
  }, [runId]);

  const routePoints = useMemo(() => parseRoutePoints(runData?.routePolyline), [runData?.routePolyline]);
  const taskEvaluation = useMemo(() => deriveTaskEvaluation(runData), [runData]);
  const isFlagged = typeof runData?.status === 'string' && runData.status.toLowerCase() === 'flagged';
  const reviewDetails = useMemo(() => getFlagReviewDetails(runData?.flagReason ?? null), [runData?.flagReason]);

  const mapRegion = useMemo(() => {
    const first = routePoints[0];
    if (!first) {
      return {
        latitude: 21.1702,
        longitude: 72.8311,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }

    return {
      latitude: first.latitude,
      longitude: first.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [routePoints]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading run details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!runData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.almostBlack} weight="bold" />
          </TouchableOpacity>
        </View>

        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Run not found</Text>
          <Text style={styles.errorSubtitle}>This run may have been deleted or not synced yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const durationMin = Math.floor(runData.duration / 60);
  const durationSec = runData.duration % 60;
  const startTime24 = format24HourTime(runData.startTime);
  const endTime24 = format24HourTime(runData.endTime);
  const runDate = formatDate(runData.createdAt || runData.startTime);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={COLORS.almostBlack} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Run Report</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.metaCard}>
          <Text style={styles.metaDate}>{runDate}</Text>
          <Text style={styles.metaTime}>{startTime24} - {endTime24} (24h)</Text>
          <Text style={styles.metaId}>Run ID: {runData.runId}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{runData.distance.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Distance (km)</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {String(durationMin).padStart(2, '0')}:{String(durationSec).padStart(2, '0')}
            </Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{runData.avgPace.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Avg Pace (min/km)</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{runData.calories}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>

        <View style={styles.mapCard}>
          <Text style={styles.sectionTitle}>Route</Text>
          <View style={styles.mapWrap}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={mapRegion}
              showsUserLocation={false}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
              showsBuildings={false}
              showsIndoors={false}
              showsPointsOfInterests={false}
            >
              {routePoints.length > 1 ? (
                <Polyline
                  coordinates={routePoints}
                  strokeWidth={4}
                  strokeColor={COLORS.accent}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : null}

              {routePoints.length > 0 ? (
                <Marker coordinate={routePoints[0]} title="Start" />
              ) : null}

              {routePoints.length > 1 ? (
                <Marker coordinate={routePoints[routePoints.length - 1]} title="Finish" />
              ) : null}
            </MapView>

            {routePoints.length === 0 ? (
              <View style={styles.emptyMapOverlay}>
                <Text style={styles.emptyMapText}>No route points saved for this run.</Text>
              </View>
            ) : null}
          </View>
        </View>

        {isFlagged ? (
          <View style={styles.reviewCard}>
            <Text style={styles.sectionTitle}>Run Review</Text>
            <Text style={styles.reviewStatus}>{reviewDetails.label}</Text>
            <Text style={styles.reviewMessage}>{reviewDetails.message}</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.reviewInfoButton}
              onPress={() => {
                Alert.alert(
                  'Run Review Details',
                  `Reason code: ${reviewDetails.code}\n\n${reviewDetails.message}`
                );
              }}
            >
              <Text style={styles.reviewInfoButtonText}>What happened?</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {taskEvaluation.hasTaskGoal ? (
          <View style={styles.taskCard}>
            <Text style={styles.sectionTitle}>Task Result</Text>
            <Text style={styles.taskStatus}>
              {taskEvaluation.completed ? 'Completed' : 'Not completed'}
            </Text>
            <Text style={styles.taskProgress}>
              {taskEvaluation.achievedKm.toFixed(2)} / {taskEvaluation.targetKm.toFixed(2)} km ({taskEvaluation.progressPct}%)
            </Text>
            <Text style={styles.taskMessage}>{taskEvaluation.message}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
  },
  headerSpacer: {
    width: 24,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.almostBlack,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily,
  },
  errorSubtitle: {
    fontSize: 14,
    color: COLORS.mediumGrey,
    textAlign: 'center',
    fontFamily: Typography.fontFamily,
  },
  metaCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  metaDate: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
  },
  metaTime: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
  },
  metaId: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.lightGrey,
    fontFamily: Typography.fontFamily,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.offWhite,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.accent,
    fontFamily: Typography.fontFamily,
  },
  statLabel: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
  },
  mapCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.almostBlack,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily,
  },
  mapWrap: {
    height: 260,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  emptyMapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  emptyMapText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: Typography.fontFamily,
  },
  taskCard: {
    backgroundColor: '#FFF3F6',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  taskStatus: {
    fontSize: 20,
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
    fontFamily: Typography.fontFamily,
    lineHeight: 20,
  },
  reviewCard: {
    backgroundColor: '#FFF6EB',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  reviewStatus: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D97706',
    fontFamily: Typography.fontFamily,
  },
  reviewMessage: {
    marginTop: Spacing.sm,
    fontSize: 14,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
    lineHeight: 20,
  },
  reviewInfoButton: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#EFE1C8',
  },
  reviewInfoButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A4A00',
    fontFamily: Typography.fontFamily,
  },
});

export default RunDetailScreen;
