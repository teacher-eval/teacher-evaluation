/**
 * Password strength scoring, ported from backend/includes/password_validator.php.
 *
 * The legacy app only *enforced* length (>= 8); the score drove a meter in the
 * registration form. Keeping the same numbers means the meter behaves
 * identically, and enforcing anything stricter stays a deliberate decision.
 */
export function passwordStrength(password: string): number {
  let score = 0;
  const length = password.length;

  score += Math.min(40, length * 4);
  if (/[A-Z]/.test(password)) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20;

  let variety = 0;
  if (/[A-Z]/.test(password)) variety += 1;
  if (/[a-z]/.test(password)) variety += 1;
  if (/[0-9]/.test(password)) variety += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) variety += 1;
  if (variety >= 3) score += 10;

  return Math.min(100, score);
}

export type StrengthLevel = 1 | 2 | 3 | 4;

export function strengthLevel(score: number): StrengthLevel {
  if (score < 40) return 1;
  if (score < 60) return 2;
  if (score < 80) return 3;
  return 4;
}

export function strengthLabel(level: StrengthLevel): string {
  return { 1: "Weak", 2: "Fair", 3: "Good", 4: "Strong" }[level];
}
