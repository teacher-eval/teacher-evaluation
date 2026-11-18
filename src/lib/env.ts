/**
 * Environment access.
 *
 * Values are read lazily so `next build` does not fail when optional
 * integrations (Redis, email) are not configured in a preview environment.
 * Anything the app cannot run without throws a message that names the
 * variable, which is much faster to debug than an undefined connection string.
 */

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(
      `Missing required environment variable ${name}. ` +
        `Add it to .env.local (see .env.example) and to the Vercel project.`,
    );
    this.name = "MissingEnvError";
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new MissingEnvError(name);
  }
  return value;
}

export function optionalEnv(name: string, fallback?: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    return fallback;
  }
  return value;
}

export function envFlag(name: string, fallback = false): boolean {
  const value = optionalEnv(name);
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const APP_NAME = optionalEnv("APP_NAME", "TVET Digital Feedback")!;
export const APP_TIMEZONE = optionalEnv("APP_TIMEZONE", "Asia/Manila")!;

/** True when the deployment has everything needed to start. */
export function hasDatabase(): boolean {
  return Boolean(optionalEnv("DATABASE_URL"));
}
