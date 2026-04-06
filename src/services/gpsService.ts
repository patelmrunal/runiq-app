import Geolocation from 'react-native-geolocation-service';
import { logTelemetry } from './telemetryService';
import { requestLocationPermissions } from './locationService';
import { startGlobalLocationWatch, stopGlobalLocationWatch } from './locationWatchManager';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

type LocationCallback = (location: Location) => void;
type ErrorCallback = (error: string) => void;

interface GeoError {
  code: number;
  message: string;
}

const PRIMARY_GPS_OPTIONS = {
  // Primary path: LocationManager for best stability on newer RN runtime.
  enableHighAccuracy: true,
  forceLocationManager: true,
  showLocationDialog: true,
  forceRequestLocation: true,
  timeout: 12000,
  maximumAge: 0,
};

const WATCH_GPS_OPTIONS = {
  enableHighAccuracy: true,
  forceLocationManager: true,
  showLocationDialog: true,
  forceRequestLocation: true,
  distanceFilter: 5,
  interval: 3000,
  fastestInterval: 1000,
};

const COARSE_FALLBACK_GPS_OPTIONS = {
  enableHighAccuracy: false,
  forceLocationManager: false,
  showLocationDialog: true,
  forceRequestLocation: true,
  timeout: 15000,
  maximumAge: 60000,
};

const MAX_ACCEPTABLE_LOCATION_AGE_MS = 15000;
const MAX_ACCEPTABLE_ACCURACY_METERS = 120;
const MAX_ACCEPTABLE_COARSE_ACCURACY_METERS = 350;
const MAX_CURRENT_LOCATION_RETRIES = 2;
const CURRENT_LOCATION_RETRY_DELAY_MS = 1200;

type RequestMode = 'primary' | 'coarse';

const normalizeGeoError = (error: any): GeoError => ({
  code: typeof error?.code === 'number' ? error.code : -1,
  message: typeof error?.message === 'string' ? error.message : 'Unknown location error',
});

// Works on ALL Android versions and architectures
export const getCurrentLocation = (
  onSuccess: LocationCallback,
  onError: ErrorCallback
): Promise<void> => {
  console.log('GPS: getCurrentLocation called');
  logTelemetry('gps.current.start');

  const runRequest = (
    options: typeof PRIMARY_GPS_OPTIONS,
    attempt: number,
    mode: RequestMode
  ): void => {
    const provider = mode === 'coarse' ? 'fused' : options.forceLocationManager ? 'location_manager' : 'fused';

    logTelemetry('gps.current.request', {
      provider,
      highAccuracy: options.enableHighAccuracy,
    });

    Geolocation.getCurrentPosition(
      (position) => {
        if (!position || !position.coords) {
          logTelemetry('gps.current.invalid_response', { provider }, 'warn');
          onError('GPS Error: Invalid location response');
          return;
        }

        const ageMs = Math.max(0, Date.now() - position.timestamp);
        const accuracy = Number(position.coords.accuracy ?? Number.POSITIVE_INFINITY);
        const maxAllowedAccuracy = mode === 'coarse'
          ? MAX_ACCEPTABLE_COARSE_ACCURACY_METERS
          : MAX_ACCEPTABLE_ACCURACY_METERS;

        if (ageMs > MAX_ACCEPTABLE_LOCATION_AGE_MS || accuracy > maxAllowedAccuracy) {
          logTelemetry(
            'gps.current.rejected_low_quality',
            {
              provider,
              mode,
              ageMs,
              accuracy,
            },
            'warn'
          );

          if (mode === 'coarse') {
            onError('GPS still searching for stable lock');
            return;
          }

          onError('GPS is still stabilizing. Please wait in an open area.');
          return;
        }

        logTelemetry('gps.current.success', {
          provider,
          mode,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy,
        });

        console.log('GPS: success', position.coords);
        onSuccess({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy,
        });
      },
      (error) => {
        const normalized = normalizeGeoError(error);

        if (normalized.code === 3 && mode === 'primary' && attempt < MAX_CURRENT_LOCATION_RETRIES) {
          const nextAttempt = attempt + 1;
          logTelemetry('gps.current.retry_scheduled', {
            provider,
            mode,
            code: normalized.code,
            attempt,
            nextAttempt,
          });

          setTimeout(() => {
            runRequest(
              {
                ...options,
                timeout: options.timeout + 6000,
              },
              nextAttempt,
              mode
            );
          }, CURRENT_LOCATION_RETRY_DELAY_MS);
          return;
        }

        if (normalized.code === 3 && mode === 'primary') {
          logTelemetry('gps.current.fallback_to_coarse', {
            provider,
            attempt,
          });
          runRequest(COARSE_FALLBACK_GPS_OPTIONS, 1, 'coarse');
          return;
        }

        if (normalized.code === 3 && mode === 'coarse') {
          logTelemetry('gps.current.timeout_waiting_lock', {
            provider,
            mode,
            attempt,
            timeoutMs: options.timeout,
          });
          console.log('GPS: timeout while waiting for stable lock');
          onError('GPS still searching for stable lock');
          return;
        }

        console.error('GPS: error', normalized.code, normalized.message);
        logTelemetry(
          'gps.current.error',
          {
            provider,
            mode,
            code: normalized.code,
            message: normalized.message,
          },
          'warn'
        );

        onError(`GPS Error ${normalized.code}: ${normalized.message}`);
      },
      options
    );
  };

  return requestLocationPermissions()
    .then((granted) => {
      if (!granted) {
        onError('Location permission not granted');
        return;
      }

      try {
        runRequest(PRIMARY_GPS_OPTIONS, 1, 'primary');
      } catch (e: any) {
        console.error('GPS: caught exception', e.message);
        logTelemetry(
          'gps.current.exception',
          {
            message: e?.message || 'Unknown exception in getCurrentLocation',
          },
          'error'
        );

        onError(e?.message || 'Unknown GPS exception');
      }
    })
    .catch((error) => {
      onError((error as any)?.message || 'Permission check failed');
    });
};

export const watchLocation = (
  onSuccess: LocationCallback,
  onError: ErrorCallback
): Promise<number> => {
  console.log('GPS: watchLocation started');
  logTelemetry('gps.watch.start', { provider: 'location_manager' });

  return requestLocationPermissions()
    .then((granted) => {
      if (!granted) {
        onError('Location permission not granted');
        return -1;
      }

      try {
        const watchId = startGlobalLocationWatch(
          'gpsService',
          (position) => {
            if (!position || !position.coords) {
              return;
            }

            logTelemetry('gps.watch.update', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });

            onSuccess({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          },
          (error) => {
            const normalized = normalizeGeoError(error);

            console.error('GPS: watch error', normalized.code, normalized.message);
            logTelemetry(
              'gps.watch.error',
              { code: normalized.code, message: normalized.message },
              'warn'
            );
            onError(`${normalized.code}: ${normalized.message}`);
          },
          WATCH_GPS_OPTIONS
        );

        console.log('GPS: watchId =', watchId);
        logTelemetry('gps.watch.started', { watchId });
        return watchId;
      } catch (e: any) {
        console.error('GPS: watch exception', e.message);
        logTelemetry('gps.watch.exception', { message: e?.message || 'Unknown watch exception' }, 'error');
        onError(e?.message || 'Unknown watch exception');
        return -1;
      }
    })
    .catch((error) => {
      onError((error as any)?.message || 'Permission check failed');
      return -1;
    });
};

export const clearLocationWatch = (watchId: number): void => {
  if (watchId >= 0) {
    logTelemetry('gps.watch.cleared', { watchId });
    stopGlobalLocationWatch('gpsService', watchId);
  }
};
