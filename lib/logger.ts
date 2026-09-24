type LogData = Record<string, unknown>;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g;

function mask(value: string): string {
  return value.replace(EMAIL, "[email]").replace(PHONE, "[phone]");
}

function sanitize(data: LogData | undefined): LogData | undefined {
  if (!data) return undefined;
  const out: LogData = {};
  for (const [key, raw] of Object.entries(data)) {
    if (typeof raw === "string") {
      const lower = key.toLowerCase();
      if (lower.includes("email")) out[key] = "[email]";
      else if (lower.includes("phone") || lower.includes("mobile")) out[key] = "[phone]";
      else out[key] = mask(raw);
    } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      out[key] = sanitize(raw as LogData);
    } else {
      out[key] = raw;
    }
  }
  return out;
}

function emit(level: "info" | "warn" | "error", event: string, data?: LogData): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(sanitize(data) ?? {}),
  });
  if (typeof window === "undefined") {
    if (level === "info") {
      // Server info stays structured, still via the allowed console channel.
      // eslint-disable-next-line no-console
      console.warn(line);
    } else if (level === "warn") {
      // eslint-disable-next-line no-console
      console.warn(line);
    } else {
      // eslint-disable-next-line no-console
      console.error(line);
    }
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(line);
  }
}

export const logger = {
  info(event: string, data?: LogData): void {
    emit("info", event, data);
  },
  warn(event: string, data?: LogData): void {
    emit("warn", event, data);
  },
  error(event: string, data?: LogData): void {
    emit("error", event, data);
  },
};
