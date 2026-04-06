import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundService from 'react-native-background-actions';
import { haversineDistance } from '../utils/haversine';
import { logTelemetry } from './telemetryService';
import {
  incrementBackgroundTrackingFailureCount,
  requestLocationPermissions,
  resetBackgroundTrackingFailureCount,
} from './locationService';
import { startGlobalLocationWatch, stopGlobalLocationWatch } from './locationWatchManager';

export interface Coordinate {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface RunSession {
  startTime: number;
  coordinates: Coordinate[];
  totalDistance: number; // metres
  pausedDuration: number;
  isPaused: boolean;
  lastPauseStart: number | null;
}

const CHECKPOINT_KEY = 'runiq_run_checkpoint';
let watchId: number | null = null;
let checkpointInterval: ReturnType<typeof setInterval> | null = null;
let session: RunSession | null = null;
let sessionUpdateCallback: ((session: RunSession) => void) | null = null;
const MAX_ACCEPTABLE_ACCURACY_METERS = 180;
const MAX_BOOTSTRAP_ACCURACY_METERS = 250;
const MAX_REALISTIC_RUNNING_SPEED_MPS = 15;
const MIN_DISTANCE_FOR_PROGRESS_METERS = 2;
const MAX_OUTLIER_WINDOW_SECONDS = 10;
const USE_FUSED_PROVIDER = false;
const ENABLE_BACKGROUND_SERVICE = false;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const buildWatchOptions = () => ({
  accuracy: { android: 'high' as const },
  enableHighAccuracy: true,
  forceLocationManager: !USE_FUSED_PROVIDER,
  showLocationDialog: true,
  forceRequestLocation: true,
  interval: 3000,
  fastestInterval: 1000,
  distanceFilter: 5,
  useSignificantChanges: false,
});

const resolveProviderLabel = (): 'fused' | 'location_manager' =>
  USE_FUSED_PROVIDER ? 'fused' : 'location_manager';

const getAccuracy = (position: Geolocation.GeoPosition): number =>
  Number(position?.coords?.accuracy ?? Number.POSITIVE_INFINITY);

const isValidLatLng = (lat: unknown, lng: unknown): boolean => {
  const numLat = Number(lat);
  const numLng = Number(lng);

  return Number.isFinite(numLat)
    && Number.isFinite(numLng)
    && Math.abs(numLat) <= 90
    && Math.abs(numLng) <= 180;
};

const smoothCoordinate = (
  previous: Coordinate,
  current: Coordinate,
  accuracy: number
): Coordinate => {
  const alpha = accuracy <= 20
    ? 0.9
    : accuracy <= 40
      ? 0.75
      : accuracy <= 80
        ? 0.6
        : accuracy <= 140
          ? 0.45
          : 0.3;

  return {
    lat: previous.lat + alpha * (current.lat - previous.lat),
    lng: previous.lng + alpha * (current.lng - previous.lng),
    timestamp: current.timestamp,
  };
};

const shouldAcceptPosition = (
  position: Geolocation.GeoPosition,
  source: 'foreground' | 'background'
): boolean => {
  if (!position?.coords) return false;

  if (!isValidLatLng(position.coords.latitude, position.coords.longitude)) {
    logTelemetry('run.gps.invalid_lat_lng_ignored', { source }, 'warn');
    return false;
  }

  const accuracy = getAccuracy(position);
  const maxAccuracy = session?.coordinates.length
    ? MAX_ACCEPTABLE_ACCURACY_METERS
    : MAX_BOOTSTRAP_ACCURACY_METERS;

  if (accuracy > maxAccuracy) {
    logTelemetry('run.gps.low_accuracy_ignored', { source, accuracy }, 'warn');
    return false;
  }

  return true;
};

const addCoordinateToSession = (
  position: Geolocation.GeoPosition,
  source: 'foreground' | 'background'
): void => {
  if (!session || session.isPaused) return;
  if (!shouldAcceptPosition(position, source)) return;

  const newCoord: Coordinate = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    timestamp: Number.isFinite(position.timestamp) ? position.timestamp : Date.now(),
  };

  if (session.coordinates.length > 0) {
    const last = session.coordinates[session.coordinates.length - 1];
    const timeDiff = (newCoord.timestamp - last.timestamp) / 1000;

    if (timeDiff <= 0) {
      logTelemetry('run.gps.invalid_timing_ignored', { source, timeDiff }, 'warn');
      return;
    }

    const accuracy = getAccuracy(position);
    const rawDistance = haversineDistance(last.lat, last.lng, newCoord.lat, newCoord.lng);
    const dynamicOutlierLimit = Math.max(25, accuracy * 1.8) + timeDiff * 4;

    if (rawDistance > dynamicOutlierLimit && timeDiff <= MAX_OUTLIER_WINDOW_SECONDS) {
      logTelemetry(
        'run.gps.outlier_ignored',
        {
          source,
          accuracy,
          rawDistance,
          dynamicOutlierLimit,
          timeDiff,
        },
        'warn'
      );
      return;
    }

    const smoothedCoord = smoothCoordinate(last, newCoord, accuracy);
    const dist = haversineDistance(last.lat, last.lng, smoothedCoord.lat, smoothedCoord.lng);

    if (dist < MIN_DISTANCE_FOR_PROGRESS_METERS) {
      logTelemetry('run.gps.micro_jitter_ignored', { source, dist }, 'warn');
      return;
    }

    const speed = dist / timeDiff;
    if (speed > MAX_REALISTIC_RUNNING_SPEED_MPS) {
      logTelemetry('run.gps.spike_ignored', { source, speed }, 'warn');
      return;
    }

    session.totalDistance += dist;
    session.coordinates.push(smoothedCoord);

    if (sessionUpdateCallback) {
      try {
        sessionUpdateCallback({ ...session });
      } catch (error) {
        logTelemetry(
          'run.session_update_callback_failed',
          { source, message: (error as any)?.message || 'Unknown callback error' },
          'warn'
        );
      }
    }
    return;
  }

  session.coordinates.push(newCoord);

  if (sessionUpdateCallback) {
    try {
      sessionUpdateCallback({ ...session });
    } catch (error) {
      logTelemetry(
        'run.session_update_callback_failed',
        { source, message: (error as any)?.message || 'Unknown callback error' },
        'warn'
      );
    }
  }
};

const startWatchSafely = (
  onPosition: (position: Geolocation.GeoPosition) => void,
  onError: (error: Geolocation.GeoError) => void,
  source: 'foreground' | 'background'
): number => {
  try {
    const startedWatchId = startGlobalLocationWatch(
      'runTrackingService',
      onPosition,
      onError,
      buildWatchOptions()
    );

    logTelemetry('run.watch.started', {
      source,
      provider: resolveProviderLabel(),
      watchId: startedWatchId,
    });
    return startedWatchId;
  } catch (error: any) {
    logTelemetry(
      'run.watch.start_failed',
      {
        source,
        message: error?.message || 'Unknown watch start exception',
      },
      'error'
    );
    return -1;
  }
};

/**
 * Background task that runs GPS tracking
 * Keeps GPS alive even when screen is off
 */
const backgroundTask = async () => {
  console.log('[BackgroundTask] Starting keep-alive loop');
  logTelemetry('run.background.start');

  while (BackgroundService.isRunning()) {
    logTelemetry('run.background.heartbeat', {
      hasSession: !!session,
      points: session?.coordinates.length ?? 0,
    });
    await sleep(5000);
  }

  logTelemetry('run.background.loop_stopped');
};

const backgroundOptions = {
  taskName: 'RuniqTracking',
  taskTitle: 'Runiq is tracking your run',
  taskDesc: 'GPS active — keep running!',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap' as const,
  },
  color: '#E94560',
  parameters: { delay: 1000 },
};

/**
 * Start GPS tracking with optional background service
 * GPS tracking works even if background service fails
 */
export async function startTracking(onUpdate: (session: RunSession) => void): Promise<void> {
  logTelemetry('run.tracking.start_requested');

  const hasPermissions = await requestLocationPermissions();
  if (!hasPermissions) {
    logTelemetry('run.tracking.permissions_denied', {}, 'warn');
    throw new Error('Location permissions are required to start tracking');
  }

  if (session && watchId !== null) {
    logTelemetry('run.tracking.start_ignored_already_running', { watchId }, 'warn');
    return;
  }

  session = {
    startTime: Date.now(),
    coordinates: [],
    totalDistance: 0,
    pausedDuration: 0,
    isPaused: false,
    lastPauseStart: null,
  };

  sessionUpdateCallback = onUpdate;

  if (watchId !== null) {
    stopGlobalLocationWatch('runTrackingService', watchId);
    watchId = null;
  }
  Geolocation.stopObserving();

  // Start GPS tracking directly (not dependent on background service)
  watchId = startWatchSafely(
    (position) => {
      addCoordinateToSession(position, 'foreground');
    },
    (error) => {
      logTelemetry(
        'run.gps.error',
        {
          source: 'foreground',
          code: error?.code,
          message: error?.message,
        },
        'warn'
      );
      console.error('[RunTracking] GPS error:', error);
    }
    ,
    'foreground'
  );

  console.log('[RunTracking] GPS watchPosition started, watchId:', watchId);
  logTelemetry('run.foreground.watch_started', { watchId });

  if (watchId < 0) {
    logTelemetry('run.tracking.watch_failed', { watchId }, 'error');
    throw new Error('Unable to start GPS watch');
  }

  // Try to start background service (optional - don't fail if it doesn't work)
  try {
    if (ENABLE_BACKGROUND_SERVICE && !BackgroundService.isRunning()) {
      await BackgroundService.start(backgroundTask, backgroundOptions);
      console.log('[RunTracking] Background service started');
      logTelemetry('run.background.service_started');
      await resetBackgroundTrackingFailureCount();
    } else if (!ENABLE_BACKGROUND_SERVICE) {
      logTelemetry('run.background.service_disabled_for_stability');
    }
  } catch (error) {
    console.error('[RunTracking] Failed to start background service (GPS still works):', error);
    const failureCount = await incrementBackgroundTrackingFailureCount();
    logTelemetry(
      'run.background.service_start_failed',
      {
        message: (error as any)?.message || 'Unknown background service error',
        failureCount,
      },
      'warn'
    );
    // GPS continues to work, just won't track when screen is off
  }

  // AsyncStorage checkpoint every 30 seconds
  checkpointInterval = setInterval(async () => {
    if (session) {
      await AsyncStorage.setItem(CHECKPOINT_KEY, JSON.stringify(session));
      logTelemetry('run.checkpoint.saved', { points: session.coordinates.length });
    }
  }, 30000);
}

export function pauseTracking(): void {
  if (session) {
    session.isPaused = true;
    session.lastPauseStart = Date.now();
  }
}

export function resumeTracking(): void {
  if (session && session.lastPauseStart) {
    session.pausedDuration += Date.now() - session.lastPauseStart;
    session.isPaused = false;
    session.lastPauseStart = null;
  }
}

export async function stopTracking(): Promise<RunSession | null> {
  logTelemetry('run.tracking.stop_requested');

  // Stop background service first
  try {
    await BackgroundService.stop();
    console.log('[RunTracking] Background service stopped');
    logTelemetry('run.background.service_stopped');
  } catch (error) {
    console.error('[RunTracking] Error stopping background service:', error);
    logTelemetry(
      'run.background.service_stop_failed',
      { message: (error as any)?.message || 'Unknown background stop error' },
      'warn'
    );
  }

  // Clear GPS watch
  if (watchId !== null) {
    stopGlobalLocationWatch('runTrackingService', watchId);
    logTelemetry('run.watch.cleared', { watchId });
    watchId = null;
  }

  // Clear checkpoint interval
  if (checkpointInterval) {
    clearInterval(checkpointInterval);
    checkpointInterval = null;
  }

  // Clear AsyncStorage checkpoint
  await AsyncStorage.removeItem(CHECKPOINT_KEY);
  logTelemetry('run.checkpoint.cleared');

  const finalSession = session;
  session = null;
  sessionUpdateCallback = null;

  logTelemetry('run.tracking.stopped', {
    hasSession: !!finalSession,
    totalDistance: finalSession?.totalDistance,
    points: finalSession?.coordinates.length,
  });

  return finalSession;
}

export function calculatePace(runSession: RunSession): number {
  // Rolling 60 second window
  const now = Date.now();
  const windowStart = now - 60000;
  const recentCoords = runSession.coordinates.filter(c => c.timestamp >= windowStart);

  if (recentCoords.length < 2) return 0;

  let recentDistance = 0;
  for (let i = 1; i < recentCoords.length; i++) {
    recentDistance += haversineDistance(
      recentCoords[i-1].lat, recentCoords[i-1].lng,
      recentCoords[i].lat, recentCoords[i].lng
    );
  }

  const timeSecs = (recentCoords[recentCoords.length-1].timestamp - recentCoords[0].timestamp) / 1000;
  if (recentDistance < 10 || timeSecs < 1) return 0;

  const paceSecPerKm = timeSecs / (recentDistance / 1000);
  return paceSecPerKm / 60; // min/km
}

export async function recoverFromCrash(): Promise<RunSession | null> {
  try {
    const saved = await AsyncStorage.getItem(CHECKPOINT_KEY);
    const recovered = saved ? JSON.parse(saved) : null;
    logTelemetry('run.recover_from_crash', { recovered: !!recovered });
    return recovered;
  } catch {
    logTelemetry('run.recover_from_crash_failed', {}, 'warn');
    return null;
  }
}
