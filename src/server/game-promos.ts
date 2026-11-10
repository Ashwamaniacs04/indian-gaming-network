import { connection } from "next/server"
import { getViewer } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import type { GamePromo } from "@/lib/types"

function relation<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null
  if (value && typeof value === "object") return value as T
  return null
}

const PROMO_SELECT =
  "id, author_id, game_title, body, youtube_url, platforms, release_label, genre, amount_paise, payment_status, paid_at, expires_at, created_at, page:pages!page_id (slug, name, logo_path)"

function mapPromo(row: Record<string, unknown>): GamePromo {
  const page = relation<GamePromo["page"]>(row.page)
  return {
    id: String(row.id),
    author_id: String(row.author_id),
    game_title: String(row.game_title ?? ""),
    body: String(row.body ?? ""),
    youtube_url: String(row.youtube_url ?? ""),
    platforms: Array.isArray(row.platforms) ? row.platforms.filter((item): item is string => typeof item === "string") : [],
    release_label: (row.release_label as string | null) ?? null,
    amount_paise: Number(row.amount_paise) || 0,
    payment_status: row.payment_status === "paid" ? "paid" : "unpaid",
    paid_at: (row.paid_at as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    genre: (row.genre as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    page,
  }
}

export async function getUpcomingGames(genre?: string) {
  if (!isSupabaseConfigured()) return [] as GamePromo[]
  await connection()
  const supabase = await createClient()
  let query = supabase
    .from("game_promos")
    .select(PROMO_SELECT)
    .eq("payment_status", "paid")
    .gt("expires_at", new Date().toISOString())
    .order("paid_at", { ascending: false })
    .limit(30)
  if (genre) query = query.eq("genre", genre)
  const { data, error } = await query
  if (error) return [] as GamePromo[]
  return (data ?? []).map((row) => mapPromo(row as unknown as Record<string, unknown>))
}

export async function getGamePromo(id: string) {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data, error } = await supabase.from("game_promos").select(PROMO_SELECT).eq("id", id).maybeSingle()
  if (error || !data) return null
  return mapPromo(data as unknown as Record<string, unknown>)
}

export async function getMyPromoPayments() {
  if (!isSupabaseConfigured()) return [] as GamePromo[]
  const viewer = await getViewer()
  if (!viewer) return [] as GamePromo[]
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("game_promos")
    .select(PROMO_SELECT)
    .eq("author_id", viewer.id)
    .eq("payment_status", "paid")
    .order("paid_at", { ascending: false })
    .limit(20)
  if (error) return [] as GamePromo[]
  return (data ?? []).map((row) => mapPromo(row as unknown as Record<string, unknown>))
}

export async function getMyUnpaidPromos() {
  if (!isSupabaseConfigured()) return [] as GamePromo[]
  const viewer = await getViewer()
  if (!viewer) return [] as GamePromo[]
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("game_promos")
    .select(PROMO_SELECT)
    .eq("author_id", viewer.id)
    .eq("payment_status", "unpaid")
    .order("created_at", { ascending: false })
    .limit(10)
  if (error) return [] as GamePromo[]
  return (data ?? []).map((row) => mapPromo(row as unknown as Record<string, unknown>))
}
