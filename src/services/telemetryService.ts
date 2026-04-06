type TelemetryLevel = 'info' | 'warn' | 'error';

interface TelemetryPayload {
  [key: string]: unknown;
}

const TELEMETRY_PREFIX = '[RuniqTelemetry]';

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ note: 'Telemetry payload serialization failed' });
  }
};

export const logTelemetry = (
  event: string,
  payload: TelemetryPayload = {},
  level: TelemetryLevel = 'info'
): void => {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  };

  const text = `${TELEMETRY_PREFIX} ${safeStringify(entry)}`;

  if (level === 'error') {
    console.error(text);
    return;
  }

  if (level === 'warn') {
    console.warn(text);
    return;
  }

  console.log(text);
};
