import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { optionalEnv, requireEnv } from "@/lib/env";

/**
 * Teacher avatar storage.
 *
 * The PHP app wrote files to frontend/assets/uploads/teachers and stored the
 * bare filename in teachers.profile_image. On Vercel the filesystem is
 * read-only, so the same column now holds an object path inside a Supabase
 * Storage bucket, and `teacherAvatarUrl()` turns it into a public URL.
 */

const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export type AvatarUpload =
  | { ok: true; path: string }
  | { ok: false; error: string; noFile?: boolean };

/**
 * Resolves a stored avatar reference to a public URL.
 *
 * Legacy rows hold a bare filename under frontend/assets/uploads/teachers.
 * After the storage migration the same column holds the object path inside the
 * Supabase bucket, so no data change is required.
 */
export function teacherAvatarUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const base = optionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!base) return null;

  const bucket = optionalEnv("SUPABASE_STORAGE_BUCKET", "teacher-avatars");
  const path = value.replace(/^\/+/, "");
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}

let client: SupabaseClient | null = null;

function storage(): SupabaseClient {
  if (client) return client;
  client = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}

function bucketName(): string {
  return optionalEnv("SUPABASE_STORAGE_BUCKET", "teacher-avatars")!;
}

/**
 * Validates and stores an avatar. Mirrors saveUploadedImage() in the PHP
 * helpers: 2 MB cap, magic-byte sniffing and a fixed extension allow-list, with
 * a random filename.
 */
export async function uploadTeacherAvatar(file: File): Promise<AvatarUpload> {
  if (file.size === 0) {
    return { ok: false, error: "no_file", noFile: true };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be smaller than 2 MB." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = detectImageMime(bytes);

  if (!mime || !ALLOWED[mime]) {
    return {
      ok: false,
      error: "Unsupported image type. Allowed: JPG, PNG, GIF, WEBP.",
    };
  }

  const path = `${randomBytes(16).toString("hex")}.${ALLOWED[mime]}`;
  const { error } = await storage()
    .storage.from(bucketName())
    .upload(path, bytes, { contentType: mime, upsert: false });

  if (error) {
    return { ok: false, error: "Could not save the uploaded image." };
  }

  return { ok: true, path };
}

/** Best-effort removal of a replaced or deleted avatar. */
export async function deleteTeacherAvatar(path: string | null | undefined): Promise<void> {
  if (!path || /^https?:\/\//i.test(path)) return;

  try {
    await storage().storage.from(bucketName()).remove([path]);
  } catch {
    // A stale object left behind is harmless; never fail the main action.
  }
}

function detectImageMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 6) {
    const head = bytes.subarray(0, 6).toString("ascii");
    if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
