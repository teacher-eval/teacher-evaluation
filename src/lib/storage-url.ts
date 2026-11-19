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

  const base = (
    process.env.NEXT_PUBLIC_SUPABASE_URL || optionalEnv("NEXT_PUBLIC_SUPABASE_URL")
  )?.replace(/\/+$/, "");

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);

      // next/image only accepts hosts listed in next.config.ts. Keep URLs that
      // already point at Supabase; re-base another host's storage URL onto the
      // configured project; drop anything else so the avatar falls back to the
      // placeholder instead of throwing during render.
      if (url.hostname.endsWith(".supabase.co")) return value;

      const marker = "/storage/v1/object/public/";
      const index = url.pathname.indexOf(marker);
      if (index >= 0 && base) return `${base}${url.pathname.slice(index)}`;

      return null;
    } catch {
      return null;
    }
  }

  if (!base) return null;

  const bucket =
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
    optionalEnv("SUPABASE_STORAGE_BUCKET", "teacher-avatar");
  const path = value.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
