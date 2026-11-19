import { optionalEnv } from "@/lib/env";

/**
 * Client-safe avatar URL helper.
 *
 * Kept separate from `@/lib/storage` so client components can build a public
 * URL without pulling the service-role Supabase client (and `node:crypto`) into
 * the browser bundle.
 */
export function teacherAvatarUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || optionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (!base) return null;

  const bucket =
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
    optionalEnv("SUPABASE_STORAGE_BUCKET", "teacher-avatar");
  const path = value.replace(/^\/+/, "");
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}
