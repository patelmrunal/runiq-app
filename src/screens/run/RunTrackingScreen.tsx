import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, ToastAndroid, Linking, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import BackgroundService from 'react-native-background-actions';
import { COLORS, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { startTracking, stopTracking, pauseTracking, resumeTracking, calculatePace, type RunSession } from '../../services/runTrackingService';
import {
  areLocationPermissionsGranted,
  requestBatteryOptimizationExemption,
  requestLocationPermissions,
} from '../../services/locationService';
import { getCurrentLocation, watchLocation, clearLocationWatch } from '../../services/gpsService';
import { haversineDistance } from '../../utils/haversine';
import { useRunStore } from '../../stores/useRunStore';
import type { MainScreenProps } from '../../navigation';
import {
  BACKGROUND_LOCATION_DISCLOSURE_MESSAGE,
  BACKGROUND_LOCATION_DISCLOSURE_TITLE,
} from '../../constants/legal';

type RunTrackingScreenProps = MainScreenProps<'RunTracking'>;

const MIN_START_ACCURACY_METERS = 80;
const MAX_ANYWHERE_START_ACCURACY_METERS = 220;
const REQUIRED_STABLE_FIXES = 2;
const MAX_STABLE_FIX_DRIFT_METERS = 120;

const RunMapSection = React.memo((props: any) => {
  const {
    mapRef,
    initialRegion,
    routeCoordinates,
    userLocation,
  } = props;

  return (
    <View style={{flex: 1, backgroundColor: '#F4F4F5', margin: 16, borderRadius: 16, overflow: 'hidden'}}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{flex: 1}}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsTraffic={false}
        showsBuildings={false}
        showsIndoors={false}
        showsPointsOfInterests={false}
        rotateEnabled={false}
        toolbarEnabled={false}
        pitchEnabled={false}
      >
        {routeCoordinates.length > 1 ? (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#FF4500"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}

        {userLocation ? (
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="You"
            description="Current location"
          />
        ) : null}
      </MapView>

      {!userLocation ? (
        <View
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            backgroundColor: 'rgba(0,0,0,0.65)',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
          }}
        >
          <Text style={{color: '#fff', fontSize: 12}}>Waiting for GPS lock...</Text>
        </View>
      ) : null}
    </View>
  );
});

// ─── Run Tracking Screen ────────────────────────────────────────────────────────

const RunTrackingScreen: React.FC<RunTrackingScreenProps> = ({ navigation, route }) => {
  const {
    taskId = 'free_run',
    taskTitle = 'Free Run',
    targetKm = 5,
    targetMinutes = 30,
    difficulty = 'Easy'
  } = route.params ?? {};

  // Permission state - MUST CHECK FIRST before any map/GPS operations
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied'>('checking');
  const [requestingPermission, setRequestingPermission] = useState(false);

  // Countdown state
  const [countdownActive, setCountdownActive] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [session, setSession] = useState<RunSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pace, setPace] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Map/GPS state
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'searching' | 'ready' | 'weak' | 'off'>('searching');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [strongFixCount, setStrongFixCount] = useState(0);

  const paceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number>(-1);
  const mapRef = useRef<MapView | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const routeCoordinatesRef = useRef<any[]>([]);
  const strongFixCountRef = useRef(0);
  const lastStrongFixRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const hasStrongLocationFix = locationStatus === 'ready';
  const hasStartableLocationFix = !!userLocation
    && (locationAccuracy ?? Number.POSITIVE_INFINITY) <= MAX_ANYWHERE_START_ACCURACY_METERS;

  const clearWarmupWatch = useCallback(() => {
    if (watchIdRef.current >= 0) {
      clearLocationWatch(watchIdRef.current);
      watchIdRef.current = -1;
    }
  }, []);

  const handleGpsError = useCallback((error: string) => {
    const message = String(error || 'Location unavailable');
    const lowered = message.toLowerCase();

    if (
      lowered.includes('provider') ||
      lowered.includes('disabled') ||
      lowered.includes('location is off') ||
      lowered.includes('settings')
    ) {
      setLocationStatus('off');
      setGpsError('Location is OFF. Turn on device location to start your run.');
      return;
    }

    if (
      lowered.includes('timed out') ||
      lowered.includes('still searching') ||
      lowered.includes('stabilizing')
    ) {
      setLocationStatus('searching');
      setGpsError('Searching GPS... stay in an open area for lock.');
      return;
    }

    setLocationStatus('weak');
    setGpsError(message);
  }, []);

  const applyLocationFix = useCallback((location: { latitude: number; longitude: number; accuracy?: number }) => {
    const accuracy = typeof location.accuracy === 'number'
      ? location.accuracy
      : Number.POSITIVE_INFINITY;

    const point = {
      latitude: location.latitude,
      longitude: location.longitude,
    };

    setUserLocation(point);
    setLocationAccuracy(Number.isFinite(accuracy) ? accuracy : null);

    if (accuracy > MIN_START_ACCURACY_METERS) {
      strongFixCountRef.current = 0;
      lastStrongFixRef.current = null;
      setStrongFixCount(0);
      setLocationStatus('weak');
      setGpsError('GPS signal is weak. Move to an open area and wait a few seconds.');
      return;
    }

    const previousStrongFix = lastStrongFixRef.current;

    if (!previousStrongFix) {
      lastStrongFixRef.current = point;
      strongFixCountRef.current = 1;
      setStrongFixCount(1);
      setLocationStatus('searching');
      setGpsError('Finalizing GPS lock...');
      return;
    }

    const driftMeters = haversineDistance(
      previousStrongFix.latitude,
      previousStrongFix.longitude,
      point.latitude,
      point.longitude
    );

    if (driftMeters > MAX_STABLE_FIX_DRIFT_METERS) {
      lastStrongFixRef.current = point;
      strongFixCountRef.current = 1;
      setStrongFixCount(1);
      setLocationStatus('searching');
      setGpsError('Improving GPS lock...');
      return;
    }

    strongFixCountRef.current += 1;
    lastStrongFixRef.current = point;
    setStrongFixCount(strongFixCountRef.current);

    if (strongFixCountRef.current >= REQUIRED_STABLE_FIXES) {
      setLocationStatus('ready');
      setGpsError(null);
      return;
    }

    setLocationStatus('searching');
    setGpsError('Finalizing GPS lock...');
  }, []);

  const startWarmupTracking = useCallback(() => {
    if (watchIdRef.current >= 0 || permissionStatus !== 'granted' || isStartingRun) {
      return;
    }

    setLocationStatus('searching');
    setGpsError(null);

    watchLocation(
      (location) => {
        applyLocationFix(location);
      },
      (error) => {
        handleGpsError(error);
      }
    )
      .then((id) => {
        watchIdRef.current = id;
      })
      .catch((error) => {
        handleGpsError((error as any)?.message || 'Unable to start GPS');
      });

    getCurrentLocation(
      (location) => {
        applyLocationFix(location);
      },
      (error) => {
        handleGpsError(error);
      }
    ).catch((error) => {
      handleGpsError((error as any)?.message || 'Unable to fetch location');
    });
  }, [permissionStatus, isStartingRun, applyLocationFix, handleGpsError]);

  // Check permission after app shell renders
  useEffect(() => {
    const timer = setTimeout(() => {
      checkPermissionState();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const checkPermissionState = async () => {
    try {
      if (Platform.OS !== 'android') {
        setPermissionStatus('granted');
        return;
      }

      const granted = await areLocationPermissionsGranted();
      setPermissionStatus(granted ? 'granted' : 'denied');
    } catch (error) {
      console.error('Permission status check error:', error);
      setPermissionStatus('denied');
    }
  };

  const showBackgroundDisclosureConfirm = () => {
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        BACKGROUND_LOCATION_DISCLOSURE_TITLE,
        BACKGROUND_LOCATION_DISCLOSURE_MESSAGE,
        [
          {
            text: 'Not now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Continue',
            onPress: () => resolve(true),
          },
        ],
        {
          cancelable: true,
          onDismiss: () => resolve(false),
        }
      );
    });
  };

  const checkAndRequestPermission = async () => {
    try {
      if (Platform.OS !== 'android') {
        setPermissionStatus('granted');
        return;
      }

      const confirmed = await showBackgroundDisclosureConfirm();
      if (!confirmed) {
        setPermissionStatus('denied');
        return;
      }

      setRequestingPermission(true);
      const granted = await requestLocationPermissions();
      setPermissionStatus(granted ? 'granted' : 'denied');
    } catch (error) {
      console.error('Permission check error:', error);
      setPermissionStatus('denied');
    } finally {
      setRequestingPermission(false);
    }
  };

  const openLocationSettings = async () => {
    try {
      if (Platform.OS === 'android') {
        await (Linking as any).sendIntent?.('android.settings.LOCATION_SOURCE_SETTINGS');
        return;
      }
    } catch {
      // fall through to app settings if direct location settings fails
    }

    try {
      await Linking.openSettings();
    } catch {
      // no-op
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only clear warmup watcher on unmount.
      // Active run tracking is stopped explicitly from handleStop.
      try {
        clearWarmupWatch();
      } catch {
        // ignore cleanup errors
      }
    };
  }, [clearWarmupWatch]);

  // GPS warmup fetch — only starts after permission confirmed
  useEffect(() => {
    if (permissionStatus !== 'granted' || isRunning || countdownActive || isStartingRun) return;

    setLocationStatus('searching');
    setGpsError(null);
    setUserLocation(null);
    setLocationAccuracy(null);
    setStrongFixCount(0);
    strongFixCountRef.current = 0;
    lastStrongFixRef.current = null;

    // Show user notification on Android
    if (Platform.OS === 'android') {
      ToastAndroid.show('GPS starting... make sure Location is ON', ToastAndroid.SHORT);
    }

    startWarmupTracking();

    return () => {
      clearWarmupWatch();
    };
  }, [permissionStatus, isRunning, countdownActive, isStartingRun, startWarmupTracking, clearWarmupWatch]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;

      if (nextState !== 'active' && !isRunning) {
        clearWarmupWatch();
        return;
      }

      if (nextState === 'active' && permissionStatus === 'granted' && !isRunning && !countdownActive && !isStartingRun) {
        startWarmupTracking();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [permissionStatus, isRunning, countdownActive, isStartingRun, startWarmupTracking, clearWarmupWatch]);

  const handleStartRun = async () => {
    console.log('12. User pressed Start Run button');

    if (isStartingRun || countdownActive || isRunning) return;

    if (!hasStartableLocationFix) {
      Alert.alert(
        'Waiting for GPS Lock',
        'Location is still searching. Please keep location ON and wait a few more seconds.',
        [
          { text: 'Open Location Settings', onPress: openLocationSettings },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    if (!hasStrongLocationFix && Platform.OS === 'android') {
      ToastAndroid.show('Starting with weak GPS lock. Tracking will auto-stabilize.', ToastAndroid.SHORT);
    }

    try {
      setIsStartingRun(true);

      // Permission already checked - safe to proceed
      // Request battery optimization exemption
      await requestBatteryOptimizationExemption();

      // Start countdown
      console.log('13. Starting countdown');
      setCountdown(3);
      setCountdownActive(true);
    } catch (error) {
      console.error('Start run error:', error);
      Alert.alert('Error', 'Could not start run. Please try again.');
      setIsStartingRun(false);
    }
  };

  const safeStartRun = async (onSessionUpdate: (session: RunSession) => void) => {
    // Start GPS first — most important
    try {
      await startTracking(onSessionUpdate);
    } catch (e) {
      console.error('GPS tracking start error:', e);
      const rawMessage = (e as any)?.message;
      const message = typeof rawMessage === 'string' && rawMessage.trim().length > 0
        ? rawMessage
        : 'Could not start GPS tracking.';
      Alert.alert('Run Start Failed', message);
      throw e; // Re-throw to prevent running state
    }

    // Try background service — optional, don't crash if fails
    try {
      if (!BackgroundService.isRunning()) {
        // Background service will be started by startTracking
        // This is just a check - actual start is in runTrackingService
        console.log('[RunTracking] Background service starting...');
      }
    } catch (e) {
      console.log('[RunTracking] Background service failed, continuing without it:', e);
      // App continues — GPS still works, just no background tracking
    }
  };

  // Countdown effect
  useEffect(() => {
    if (!countdownActive) return;
    if (countdown > 0) {
      console.log('14. Countdown:', countdown);
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      console.log('15. Countdown complete, initializing tracking');
      setCountdownActive(false);

      // Start tracking with error handling
      const initializeTracking = async () => {
        try {
          clearWarmupWatch();
          routeCoordinatesRef.current = [];

          console.log('16. Starting GPS tracking...');
          await safeStartRun((updatedSession) => {
            setSession(updatedSession);
            const mappedCoordinates = updatedSession.coordinates
              .filter((point) => Number.isFinite(point.lat)
                && Number.isFinite(point.lng)
                && Math.abs(point.lat) <= 90
                && Math.abs(point.lng) <= 180)
              .map((point) => ({
                latitude: point.lat,
                longitude: point.lng,
              }));

            routeCoordinatesRef.current = mappedCoordinates;

            const latestPoint = mappedCoordinates[mappedCoordinates.length - 1];
            if (latestPoint) {
              setUserLocation(latestPoint);
              setLocationStatus('ready');
              setGpsError(null);
            }
          });
          console.log('17. GPS tracking started successfully');
          setIsRunning(true);
          setIsStartingRun(false);
        } catch (error) {
          console.error('18. GPS tracking error:', error);
          const rawMessage = (error as any)?.message;
          const message = typeof rawMessage === 'string' && rawMessage.trim().length > 0
            ? rawMessage
            : 'Could not access GPS. Please check location settings.';
          Alert.alert('Run Start Failed', message);
          setCountdown(3); // Reset countdown
          setIsStartingRun(false);
        }
      };

      initializeTracking();
    }
  }, [countdown, countdownActive, clearWarmupWatch]);

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

  useEffect(() => {
    if (!isRunning || !userLocation || !mapRef.current) {
      return;
    }

    try {
      mapRef.current.animateCamera(
        {
          center: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
          zoom: 17,
        },
        { duration: 500 }
      );
    } catch {
      // ignore camera animation errors
    }
  }, [isRunning, userLocation]);

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
    routeCoordinatesRef.current = [];

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
  const mapInitialRegion = {
    latitude: userLocation?.latitude ?? 21.1702,
    longitude: userLocation?.longitude ?? 72.8311,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Permission check screen - CRITICAL: Must pass before anything else renders
  if (permissionStatus === 'checking') {
    console.log('Render: Checking permissions...');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.checkingText}>Checking permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (permissionStatus === 'denied') {
    console.log('Render: Permission denied screen');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.permissionIcon}>📍</Text>
          <Text style={styles.permissionTitle}>Location Required</Text>
          <Text style={styles.permissionText}>
            Runiq collects precise location data during an active run, including when the app is closed or your screen is off, so your distance and route remain accurate.
          </Text>
          <Text style={styles.permissionTextMuted}>
            Background location is used only while a run is active.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={checkAndRequestPermission}
            disabled={requestingPermission}
          >
            {requestingPermission ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButtonStyle}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Only renders if permissionStatus === 'granted'
  console.log('Render: Permission granted, showing main UI');
  console.log('RENDER START - userLocation:', userLocation, 'isRunning:', isRunning, 'countdownActive:', countdownActive);

  // Pre-run screen - show start button
  if (!countdownActive && !isRunning) {
    console.log('RENDER: Pre-run screen');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.taskTitleLarge}>{taskTitle}</Text>
          <Text style={styles.taskDetails}>
            {targetKm}km • {targetMinutes} min • {difficulty}
          </Text>
          {locationStatus === 'searching' && (
            <Text style={styles.infoText}>
              {strongFixCount > 0
                ? `Stabilizing GPS (${strongFixCount}/${REQUIRED_STABLE_FIXES})...`
                : 'Searching for GPS...'}
            </Text>
          )}
          {locationStatus === 'off' && (
            <Text style={styles.warningText}>Location is OFF. Please turn it ON.</Text>
          )}
          {locationStatus === 'weak' && (
            <Text style={styles.warningText}>GPS weak. You can still start; tracking will stabilize automatically.</Text>
          )}
          {locationStatus === 'ready' && (
            <Text style={styles.successText}>
              GPS ready{locationAccuracy ? ` (${Math.round(locationAccuracy)}m)` : ''}
            </Text>
          )}

          {gpsError && locationStatus !== 'ready' ? (
            <Text style={styles.errorTextSmall}>{gpsError}</Text>
          ) : null}

          {locationStatus === 'off' && (
            <TouchableOpacity style={styles.settingsButton} onPress={openLocationSettings}>
              <Text style={styles.settingsButtonText}>Turn On Location</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.startButton, !hasStartableLocationFix && styles.startButtonDisabled]}
            onPress={handleStartRun}
            disabled={!hasStartableLocationFix || isStartingRun}
          >
            <Text style={styles.startButtonText}>{isStartingRun ? 'Starting...' : 'Start Run'}</Text>
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

  // Running screen with map
  console.log('RENDER: Running screen');
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <Text style={{fontSize: 32, fontWeight: '700', textAlign: 'center', marginTop: 32}}>
        {formatTime(elapsedSeconds)}
      </Text>

      {gpsError && (
        <Text style={{color: '#F59E0B', fontSize: 12, textAlign: 'center', marginTop: 4}}>
          ⚠️ GPS signal weak — move to open area
        </Text>
      )}

      <View style={{flexDirection: 'row', margin: 16, gap: 12}}>
        <View style={{flex: 1, padding: 16, backgroundColor: '#F4F4F5', borderRadius: 12, alignItems: 'center'}}>
          <Text style={{color: '#71717A', fontSize: 12}}>Distance</Text>
          <Text style={{fontSize: 20, fontWeight: '700'}}>{distanceKm.toFixed(2)} km</Text>
        </View>
        <View style={{flex: 1, padding: 16, backgroundColor: '#F4F4F5', borderRadius: 12, alignItems: 'center'}}>
          <Text style={{color: '#71717A', fontSize: 12}}>Pace</Text>
          <Text style={{fontSize: 20, fontWeight: '700'}}>{pace.toFixed(2)} min/km</Text>
        </View>
        <View style={{flex: 1, padding: 16, backgroundColor: '#F4F4F5', borderRadius: 12, alignItems: 'center'}}>
          <Text style={{color: '#71717A', fontSize: 12}}>Calories</Text>
          <Text style={{fontSize: 20, fontWeight: '700'}}>{calories}</Text>
        </View>
      </View>

      <RunMapSection
        mapRef={mapRef}
        initialRegion={mapInitialRegion}
        routeCoordinates={routeCoordinatesRef.current}
        userLocation={userLocation}
      />

      <View style={{flexDirection: 'row', padding: 16, gap: 12}}>
        <TouchableOpacity
          style={{flex: 1, padding: 16, backgroundColor: '#F4F4F5', borderRadius: 12, alignItems: 'center'}}
          onPress={handlePauseResume}
        >
          <Text style={{fontWeight: '600'}}>{isPaused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{flex: 1, padding: 16, backgroundColor: '#E94560', borderRadius: 12, alignItems: 'center'}}
          onPress={handleStop}
        >
          <Text style={{color: '#fff', fontWeight: '700'}}>Stop</Text>
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
    marginBottom: Spacing.sm,
  },
  permissionTextMuted: {
    fontSize: 13,
    color: COLORS.lightGrey,
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
  backButtonStyle: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  backText: {
    fontSize: 14,
    color: COLORS.mediumGrey,
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
  infoText: {
    color: COLORS.mediumGrey,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily,
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily,
  },
  successText: {
    color: '#10B981',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily,
  },
  errorTextSmall: {
    color: '#B45309',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily,
  },
  settingsButton: {
    backgroundColor: '#111827',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  settingsButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Typography.fontFamily,
  },
  startButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    minWidth: 200,
    alignItems: 'center',
  },
  startButtonDisabled: {
    opacity: 0.45,
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
});

export default RunTrackingScreen;
