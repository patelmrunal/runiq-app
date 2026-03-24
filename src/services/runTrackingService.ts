import Geolocation from 'react-native-geolocation-service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundService from 'react-native-background-actions';
import { haversineDistance } from '../utils/haversine';

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

/**
 * Background task that runs GPS tracking
 * Keeps GPS alive even when screen is off
 */
const backgroundTask = async () => {
  console.log('[BackgroundTask] Starting GPS tracking');

  await new Promise<void>(() => {
    // This promise never resolves — keeps background service alive
    // We'll stop it manually with BackgroundService.stop()

    watchId = Geolocation.watchPosition(
      (position) => {
        if (!session || session.isPaused) return;

        const newCoord: Coordinate = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp,
        };

        // Ignore GPS noise spikes > 15 m/s (54 km/h)
        if (session.coordinates.length > 0) {
          const last = session.coordinates[session.coordinates.length - 1];
          const dist = haversineDistance(last.lat, last.lng, newCoord.lat, newCoord.lng);
          const timeDiff = (newCoord.timestamp - last.timestamp) / 1000;
          const speed = dist / timeDiff;
          if (speed > 15) return; // spike — ignore
          session.totalDistance += dist;
        }

        session.coordinates.push(newCoord);

        // Call UI update callback
        if (sessionUpdateCallback) {
          sessionUpdateCallback({ ...session });
        }
      },
      (error) => console.error('[BackgroundTask] GPS error:', error),
      {
        accuracy: { android: 'high' },
        interval: 5000,
        fastestInterval: 3000,
        distanceFilter: 5,
        forceRequestLocation: true,
        showLocationDialog: true,
        useSignificantChanges: false,
      }
    );

    console.log('[BackgroundTask] GPS watchPosition started, watchId:', watchId);
  });
};

const backgroundOptions = {
  taskName: 'RuniqTracking',
  taskTitle: 'Runiq is tracking your run',
  taskDesc: 'GPS active — keep running!',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#E94560',
  linkingURI: 'runiq://dashboard',
  parameters: { delay: 1000 },
};

/**
 * Start GPS tracking with background service
 * This keeps GPS alive even when screen is off
 */
export async function startTracking(onUpdate: (session: RunSession) => void): Promise<void> {
  session = {
    startTime: Date.now(),
    coordinates: [],
    totalDistance: 0,
    pausedDuration: 0,
    isPaused: false,
    lastPauseStart: null,
  };

  sessionUpdateCallback = onUpdate;

  // Start background service with GPS tracking
  try {
    await BackgroundService.start(backgroundTask, backgroundOptions);
    console.log('[RunTracking] Background service started');
  } catch (error) {
    console.error('[RunTracking] Failed to start background service:', error);
  }

  // AsyncStorage checkpoint every 30 seconds
  checkpointInterval = setInterval(async () => {
    if (session) {
      await AsyncStorage.setItem(CHECKPOINT_KEY, JSON.stringify(session));
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
  // Stop background service first
  try {
    await BackgroundService.stop();
    console.log('[RunTracking] Background service stopped');
  } catch (error) {
    console.error('[RunTracking] Error stopping background service:', error);
  }

  // Clear GPS watch
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }

  // Clear checkpoint interval
  if (checkpointInterval) {
    clearInterval(checkpointInterval);
    checkpointInterval = null;
  }

  // Clear AsyncStorage checkpoint
  await AsyncStorage.removeItem(CHECKPOINT_KEY);

  const finalSession = session;
  session = null;
  sessionUpdateCallback = null;

  return finalSession;
}

export function calculatePace(session: RunSession): number {
  // Rolling 60 second window
  const now = Date.now();
  const windowStart = now - 60000;
  const recentCoords = session.coordinates.filter(c => c.timestamp >= windowStart);

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
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}
