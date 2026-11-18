/**
 * Structured server logging.
 *
 * The PHP app wrote to logs/*.log; serverless deployments have no writable
 * disk, so everything goes to stdout/stderr where Vercel collects it.
 * Never log passwords, OTP codes or full email addresses.
 */

type LogData = Record<string, unknown>;

function emit(level: "info" | "warn" | "error", event: string, data: LogData) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export function logSecurity(event: string, data: LogData = {}) {
  emit("warn", `security.${event}`, data);
}

export function logAudit(event: string, data: LogData = {}) {
  emit("info", `audit.${event}`, data);
}

export function logError(event: string, data: LogData = {}) {
  emit("error", event, data);
}
