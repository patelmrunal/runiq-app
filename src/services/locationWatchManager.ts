import Geolocation from 'react-native-geolocation-service';
import { logTelemetry } from './telemetryService';

let activeWatchId: number | null = null;
let activeWatchOwner: string | null = null;

const clearActiveWatch = () => {
  if (activeWatchId === null) {
    return;
  }

  try {
    Geolocation.clearWatch(activeWatchId);
    Geolocation.stopObserving();
  } catch (error) {
    logTelemetry(
      'gps.watch.global_clear_failed',
      {
        watchId: activeWatchId,
        owner: activeWatchOwner,
        message: (error as any)?.message || 'Unknown clearWatch error',
      },
      'warn'
    );
  }

  activeWatchId = null;
  activeWatchOwner = null;
};

export const startGlobalLocationWatch = (
  owner: string,
  onSuccess: (position: Geolocation.GeoPosition) => void,
  onError: (error: Geolocation.GeoError) => void,
  options: any
): number => {
  if (activeWatchId !== null) {
    logTelemetry('gps.watch.global_replaced', {
      previousOwner: activeWatchOwner,
      nextOwner: owner,
      previousWatchId: activeWatchId,
    });
    clearActiveWatch();
  }

  const watchId = Geolocation.watchPosition(
    (position) => {
      try {
        onSuccess(position);
      } catch (error) {
        logTelemetry(
          'gps.watch.global_success_handler_failed',
          {
            owner,
            watchId,
            message: (error as any)?.message || 'Unknown success handler error',
          },
          'warn'
        );
      }
    },
    (error) => {
      try {
        onError(error);
      } catch (handlerError) {
        logTelemetry(
          'gps.watch.global_error_handler_failed',
          {
            owner,
            watchId,
            code: error?.code,
            message: (handlerError as any)?.message || 'Unknown error handler failure',
          },
          'warn'
        );
      }
    },
    options
  );

  activeWatchId = watchId;
  activeWatchOwner = owner;

  logTelemetry('gps.watch.global_started', {
    owner,
    watchId,
  });

  return watchId;
};

export const stopGlobalLocationWatch = (owner: string, watchId?: number): void => {
  if (activeWatchId === null) {
    return;
  }

  if (typeof watchId === 'number' && watchId !== activeWatchId) {
    return;
  }

  logTelemetry('gps.watch.global_stop_requested', {
    owner,
    activeOwner: activeWatchOwner,
    activeWatchId,
  });

  clearActiveWatch();
};

export const getGlobalLocationWatchState = () => ({
  watchId: activeWatchId,
  owner: activeWatchOwner,
});
