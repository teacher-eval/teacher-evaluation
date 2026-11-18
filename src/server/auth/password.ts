import bcrypt from "bcryptjs";

/**
 * Password primitives shared by the auth and account flows.
 *
 * PHP's password_hash() emits `$2y$` hashes. Node's bcryptjs accepts the
 * variant in practice, but normalising to `$2b$` removes any doubt and keeps
 * the cost factor intact.
 */
const COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const normalized = hash.startsWith("$2y$") ? `$2b$${hash.slice(4)}` : hash;
  try {
    return await bcrypt.compare(password, normalized);
  } catch {
    return false;
  }
}
