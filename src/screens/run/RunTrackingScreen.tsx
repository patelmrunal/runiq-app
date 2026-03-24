import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { Pause, Play, Stop } from 'phosphor-react-native';
import { COLORS, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { startTracking, stopTracking, pauseTracking, resumeTracking, calculatePace, type RunSession } from '../../services/runTrackingService';
import { requestLocationPermissions, requestBatteryOptimizationExemption } from '../../services/locationService';
import { useRunStore } from '../../stores/useRunStore';
import type { MainScreenProps } from '../../navigation';

type RunTrackingScreenProps = MainScreenProps<'RunTracking'>;

const RunTrackingScreen: React.FC<RunTrackingScreenProps> = ({ navigation, route }) => {
  const {
    taskId = 'free_run',
    taskTitle = 'Free Run',
    targetKm = 5,
    targetMinutes = 30,
    difficulty = 'Easy'
  } = route.params ?? {};

  // Permission state
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);

  // Countdown state
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [session, setSession] = useState<RunSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pace, setPace] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Map state
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{latitude: number; longitude: number}>>([]);

  const mapRef = useRef<MapView>(null);
  const paceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check permission on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const granted = await requestLocationPermissions();
      setPermissionGranted(granted);
      if (granted) {
        // Get initial location
        Geolocation.getCurrentPosition(
          (pos) => setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
          (err) => console.error('GPS Error:', err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setPermissionGranted(false);
    }
  };

  const handleGrantPermission = async () => {
    setRequestingPermission(true);
    await checkPermissions();
    setRequestingPermission(false);
  };

  const handleStartRun = () => {
    requestBatteryOptimizationExemption();
    setCountdownActive(true);
  };

  // Countdown effect
  useEffect(() => {
    if (!countdownActive) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCountdownActive(false);
      setIsRunning(true);
      startTracking((updatedSession) => {
        setSession(updatedSession);
        // Update route coordinates
        if (updatedSession.coordinates.length > 0) {
          setRouteCoordinates(
            updatedSession.coordinates.map(c => ({
              latitude: c.lat,
              longitude: c.lng,
            }))
          );
        }
      });
    }
  }, [countdown, countdownActive]);

  // Timer tick - only when isRunning is true and not paused
  useEffect(() => {
    if (!isRunning || isPaused) return;
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, isPaused]);

  // Pace calculation effect
  useEffect(() => {
    if (!session || isPaused) return;
    paceIntervalRef.current = setInterval(() => {
      if (session) {
        const newPace = calculatePace(session);
        setPace(newPace);
      }
    }, 1000);

    return () => {
      if (paceIntervalRef.current) clearInterval(paceIntervalRef.current);
    };
  }, [session, isPaused]);

  const formatTime = (secs: number): string => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handlePauseResume = () => {
    if (isPaused) {
      resumeTracking();
      setIsPaused(false);
    } else {
      pauseTracking();
      setIsPaused(true);
    }
  };

  const handleStop = async () => {
    setIsRunning(false);
    const finalSession = await stopTracking();
    if (paceIntervalRef.current) clearInterval(paceIntervalRef.current);

    if (finalSession) {
      const runId = Date.now().toString();
      useRunStore.getState().setLastSessionData({
        runId,
        session: finalSession,
        taskId,
        taskTitle,
        targetKm,
        targetMinutes,
        difficulty,
      });
      navigation.navigate('PostRunSummary', { runId });
    }
  };

  const distanceKm = session ? session.totalDistance / 1000 : 0;
  const calories = Math.round(distanceKm * 70 * 1.036);

  // Permission check screen
  if (permissionGranted === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.checkingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (permissionGranted === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.permissionIcon}>📍</Text>
          <Text style={styles.permissionTitle}>Location Permission Required</Text>
          <Text style={styles.permissionText}>
            Runiq needs GPS access to track your run accurately
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={handleGrantPermission}
            disabled={requestingPermission}
          >
            {requestingPermission ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Pre-run screen - show start button
  if (!countdownActive && !isRunning) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.taskTitleLarge}>{taskTitle}</Text>
          <Text style={styles.taskDetails}>
            {targetKm}km • {targetMinutes} min • {difficulty}
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={handleStartRun}>
            <Text style={styles.startButtonText}>Start Run</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Countdown screen
  if (countdownActive) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownText}>
            {countdown > 0 ? countdown : 'GO!'}
          </Text>
          <Text style={styles.countdownSubtext}>Get ready...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Running screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.elapsedTime}>{formatTime(elapsedSeconds)}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{distanceKm.toFixed(2)} km</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Pace</Text>
          <Text style={styles.statValue}>{pace.toFixed(2)} min/km</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Calories</Text>
          <Text style={styles.statValue}>{calories}</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        {userLocation ? (
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            showsUserLocation={true}
            followsUserLocation={true}
            showsMyLocationButton={false}
          >
            {routeCoordinates.length > 1 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={COLORS.accent}
                strokeWidth={4}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.acquiringText}>Acquiring GPS...</Text>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, styles.pauseButton]}
          onPress={handlePauseResume}
        >
          {isPaused ? (
            <>
              <Play size={24} color={COLORS.accent} weight="fill" />
              <Text style={styles.buttonText}>Resume</Text>
            </>
          ) : (
            <>
              <Pause size={24} color={COLORS.mediumGrey} weight="fill" />
              <Text style={[styles.buttonText, { color: COLORS.mediumGrey }]}>Pause</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.stopButton]}
          onPress={handleStop}
        >
          <Stop size={24} color={COLORS.white} weight="fill" />
          <Text style={[styles.buttonText, { color: COLORS.white }]}>Stop</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  checkingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
  },
  permissionIcon: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  permissionButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minWidth: 200,
    alignItems: 'center',
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: Typography.fontFamily,
  },
  taskTitleLarge: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.sm,
  },
  taskDetails: {
    fontSize: 16,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
    marginBottom: Spacing.xl,
  },
  startButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minWidth: 200,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    fontFamily: Typography.fontFamily,
  },
  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: '700',
    color: COLORS.accent,
    fontFamily: Typography.fontFamily,
  },
  countdownSubtext: {
    fontSize: 18,
    color: COLORS.mediumGrey,
    marginTop: Spacing.md,
    fontFamily: Typography.fontFamily,
  },
  header: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  elapsedTime: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.mediumGrey,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.almostBlack,
    fontFamily: Typography.fontFamily,
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    borderRadius: 16,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.offWhite,
  },
  acquiringText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: COLORS.mediumGrey,
    fontFamily: Typography.fontFamily,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  pauseButton: {
    backgroundColor: COLORS.offWhite,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stopButton: {
    backgroundColor: COLORS.accent,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
    fontFamily: Typography.fontFamily,
  },
});

export default RunTrackingScreen;
