import type { SupabaseClient } from "@supabase/supabase-js"

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
])

const MAX_BYTES = 5 * 1024 * 1024

export async function uploadImage(
  supabase: SupabaseClient,
  bucket: "avatars" | "banners" | "posts" | "portfolio",
  userId: string,
  entry: FormDataEntryValue | null,
) {
  if (!(entry instanceof File) || entry.size === 0) return { path: null as string | null }
  const extension = ALLOWED.get(entry.type)
  if (!extension) return { error: "Use a JPG, PNG, WEBP, or GIF." }
  if (entry.size > MAX_BYTES) return { error: "Images must be 5 MB or smaller." }

  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const bytes = Buffer.from(await entry.arrayBuffer())
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: entry.type,
    upsert: false,
  })
  if (error) return { error: "The image could not be uploaded." }
  return { path }
}

export function monthToDate(value: string) {
  if (!value) return null
  if (!/^\d{4}-\d{2}$/.test(value)) return null
  return `${value}-01`
}
