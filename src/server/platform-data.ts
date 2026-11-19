import { connection } from "next/server"
import { mapProfile, getViewer } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import type { GamePromo, PlaytestCard, PostCard, Profile, StudioPage } from "@/lib/types"

function relation<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null
  if (value && typeof value === "object") return value as T
  return null
}

export type MyApplication = {
  id: string
  status: string
  message: string
  created_at: string
  kind: string
  title: string
}

export type MeetupCard = {
  id: string
  host_id: string
  name: string
  city: string
  place: string
  starts_at: string
  spots: number
  note: string
  host_name: string
  host_username: string
}

export type MeetupRequestRow = {
  id: string
  why: string
  status: string
  profile_id: string
  username: string
  display_name: string
  avatar_path: string | null
}

export type PageMember = {
  id: string
  username: string
  display_name: string
  avatar_path: string | null
  headline: string | null
}

export type FollowedGame = { game_key: string; game_name: string }

export type AdminAccount = {
  id: string
  email: string
  username: string
  display_name: string
  role: string
  created_at: string
}

export type ReportRow = {
  id: string
  target_type: string
  target_id: string
  reason: string
  created_at: string
  reporter_name: string
  reporter_username: string
}

export async function getMyApplications() {
  if (!isSupabaseConfigured()) return [] as MyApplication[]
  const viewer = await getViewer()
  if (!viewer) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("interests")
    .select("id, message, status, created_at, post:posts!post_id (post_type, job_title, collab_title), playtest:playtest_listings!playtest_id (title)")
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) return []
  return (data ?? []).map((row) => {
    const record = row as unknown as Record<string, unknown>
    const post = relation<{ post_type?: string; job_title?: string | null; collab_title?: string | null }>(record.post)
    const playtest = relation<{ title?: string }>(record.playtest)
    const kind = playtest ? "Playtest" : post?.post_type === "collab" ? "Collab" : "Job"
    return {
      id: String(record.id),
      status: String(record.status ?? "pending"),
      message: String(record.message ?? ""),
      created_at: String(record.created_at ?? ""),
      kind,
      title: playtest?.title || post?.job_title || post?.collab_title || "Listing",
    }
  })
}

export async function getSavedTargetIds() {
  const empty = { posts: [] as string[], playtests: [] as string[] }
  if (!isSupabaseConfigured()) return empty
  const viewer = await getViewer()
  if (!viewer) return empty
  const supabase = await createClient()
  const { data, error } = await supabase.from("saved_listings").select("target_type, target_id").eq("user_id", viewer.id)
  if (error) return empty
  const posts: string[] = []
  const playtests: string[] = []
  for (const row of data ?? []) {
    const item = row as { target_type: string; target_id: string }
    if (item.target_type === "post") posts.push(item.target_id)
    if (item.target_type === "playtest") playtests.push(item.target_id)
  }
  return { posts, playtests }
}

export async function searchPeopleByGame(game: string) {
  if (!isSupabaseConfigured()) return [] as Profile[]
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("search_people_by_game", { p_game: game })
  if (error || !Array.isArray(data) || data.length === 0) return []
  const ids = (data as { id: string }[]).map((row) => row.id)
  const { data: rows } = await supabase.from("profiles").select("*").in("id", ids)
  const people = (rows ?? []).map((row) => mapProfile(row as Record<string, unknown>))
  const order = new Map(ids.map((id, index) => [id, index]))
  return people.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
}

export async function getMeetups() {
  if (!isSupabaseConfigured()) return [] as MeetupCard[]
  await connection()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("meetups")
    .select("id, host_id, name, city, place, starts_at, spots, note, host:profiles!host_id (display_name, username)")
    .gte("starts_at", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(40)
  if (error) return []
  return (data ?? []).map((row) => mapMeetup(row as unknown as Record<string, unknown>))
}

export async function getMeetup(id: string) {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("meetups")
    .select("id, host_id, name, city, place, starts_at, spots, note, host:profiles!host_id (display_name, username)")
    .eq("id", id)
    .maybeSingle()
  if (error || !data) return null
  return mapMeetup(data as unknown as Record<string, unknown>)
}

function mapMeetup(row: Record<string, unknown>): MeetupCard {
  const host = relation<{ display_name?: string; username?: string }>(row.host)
  return {
    id: String(row.id),
    host_id: String(row.host_id),
    name: String(row.name ?? ""),
    city: String(row.city ?? ""),
    place: String(row.place ?? ""),
    starts_at: String(row.starts_at ?? ""),
    spots: Number(row.spots) || 0,
    note: String(row.note ?? ""),
    host_name: host?.display_name || "Member",
    host_username: host?.username || "",
  }
}

export async function getMeetupRequests(meetupId: string) {
  if (!isSupabaseConfigured()) return [] as MeetupRequestRow[]
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("meetup_requests")
    .select("id, why, status, profile_id, profile:profiles!profile_id (username, display_name, avatar_path)")
    .eq("meetup_id", meetupId)
    .order("created_at", { ascending: true })
  if (error) return []
  return (data ?? []).map((row) => {
    const record = row as unknown as Record<string, unknown>
    const profile = relation<{ username?: string; display_name?: string; avatar_path?: string | null }>(record.profile)
    return {
      id: String(record.id),
      why: String(record.why ?? ""),
      status: String(record.status ?? "pending"),
      profile_id: String(record.profile_id),
      username: profile?.username || "",
      display_name: profile?.display_name || "Member",
      avatar_path: profile?.avatar_path ?? null,
    }
  })
}

export async function getPageMembers(pageId: string) {
  if (!isSupabaseConfigured()) return [] as PageMember[]
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("page_members")
    .select("profile:profiles!profile_id (id, username, display_name, avatar_path, headline)")
    .eq("page_id", pageId)
  if (error) return []
  return (data ?? []).map((row) => {
    const profile = relation<PageMember>( (row as { profile: unknown }).profile )
    return {
      id: profile?.id ?? "",
      username: profile?.username ?? "",
      display_name: profile?.display_name ?? "Member",
      avatar_path: profile?.avatar_path ?? null,
      headline: profile?.headline ?? null,
    }
  }).filter((member) => member.id)
}

export async function getFollowedGames() {
  if (!isSupabaseConfigured()) return [] as FollowedGame[]
  const viewer = await getViewer()
  if (!viewer) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("game_follows")
    .select("game_key, game_name")
    .eq("user_id", viewer.id)
    .order("game_name", { ascending: true })
  if (error) return []
  return (data ?? []) as FollowedGame[]
}

function exact(value: string) {
  return value.replace(/[%_,]/g, " ").trim()
}

export async function getGameBoard(title: string) {
  const empty = { playtests: [] as PlaytestCard[], posts: [] as PostCard[], promos: [] as GamePromo[] }
  const term = exact(title)
  if (!isSupabaseConfigured() || term.length < 2) return empty
  await connection()
  const supabase = await createClient()
  const playtestVerified = await supabase
    .from("playtest_listings")
    .select("id, title, game_title, description, platforms, location_type, city, state, compensation, slots, deadline, status, created_at, page:pages!page_id (slug, name, logo_path, verified)")
    .eq("status", "open")
    .ilike("game_title", term)
    .limit(20)
  const playtests = playtestVerified.error
    ? (await supabase
      .from("playtest_listings")
      .select("id, title, game_title, description, platforms, location_type, city, state, compensation, slots, deadline, status, created_at, page:pages!page_id (slug, name, logo_path)")
      .eq("status", "open")
      .ilike("game_title", term)
      .limit(20)).data
    : playtestVerified.data
  const postVerified = await supabase
    .from("posts")
    .select("id, post_type, body, job_title, collab_title, game_title, created_at, closed_at, author:profiles!author_id (username, display_name, avatar_path, headline, role, verified), page:pages!page_id (slug, name, logo_path, verified)")
    .in("post_type", ["job", "collab"])
    .is("closed_at", null)
    .ilike("game_title", term)
    .limit(20)
  const posts = postVerified.error
    ? (await supabase
      .from("posts")
      .select("id, post_type, body, job_title, collab_title, game_title, created_at, closed_at, author:profiles!author_id (username, display_name, avatar_path, headline, role), page:pages!page_id (slug, name, logo_path)")
      .in("post_type", ["job", "collab"])
      .is("closed_at", null)
      .ilike("game_title", term)
      .limit(20)).data
    : postVerified.data
  const postRows = posts ?? await (async () => {
    const retry = await supabase
      .from("posts")
      .select("id, post_type, body, job_title, collab_title, game_title, created_at, author:profiles!author_id (username, display_name, avatar_path, headline, role), page:pages!page_id (slug, name, logo_path)")
      .in("post_type", ["job", "collab"])
      .ilike("game_title", term)
      .limit(20)
    return retry.data
  })()
  const { data: promos } = await supabase
    .from("game_promos")
    .select("id, author_id, game_title, body, youtube_url, platforms, release_label, genre, amount_paise, payment_status, paid_at, expires_at, created_at, page:pages!page_id (slug, name, logo_path)")
    .eq("payment_status", "paid")
    .gt("expires_at", new Date().toISOString())
    .ilike("game_title", term)
    .limit(10)

  return {
    playtests: (playtests ?? []).map((row) => mapPlaytest(row as unknown as Record<string, unknown>)).filter((row): row is PlaytestCard => row !== null),
    posts: (postRows ?? []).map((row) => mapLitePost(row as unknown as Record<string, unknown>)),
    promos: (promos ?? []).map((row) => mapLitePromo(row as unknown as Record<string, unknown>)),
  }
}

function mapPlaytest(row: Record<string, unknown>): PlaytestCard | null {
  const page = relation<PlaytestCard["page"]>(row.page)
  if (!page) return null
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    game_title: String(row.game_title ?? ""),
    description: String(row.description ?? ""),
    platforms: Array.isArray(row.platforms) ? (row.platforms as string[]) : [],
    location_type: (row.location_type as PlaytestCard["location_type"]) ?? "remote",
    city: (row.city as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    compensation: (row.compensation as string | null) ?? null,
    slots: typeof row.slots === "number" ? row.slots : null,
    deadline: (row.deadline as string | null) ?? null,
    status: row.status === "closed" ? "closed" : "open",
    created_at: String(row.created_at),
    page: { ...page, verified: Boolean(page.verified) },
  }
}

function mapLitePost(row: Record<string, unknown>): PostCard {
  const author = relation<PostCard["author"]>(row.author) ?? {
    username: "member",
    display_name: "Member",
    avatar_path: null,
    headline: null,
    role: "gamer",
    verified: false,
  }
  const page = relation<NonNullable<PostCard["page"]>>(row.page)
  return {
    id: String(row.id),
    post_type: row.post_type as PostCard["post_type"],
    body: String(row.body ?? ""),
    image_path: null,
    youtube_url: null,
    job_title: (row.job_title as string | null) ?? null,
    job_location: null,
    job_type: null,
    collab_title: (row.collab_title as string | null) ?? null,
    collab_looking_for: [],
    game_title: (row.game_title as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    closed_at: (row.closed_at as string | null) ?? null,
    image_expired: false,
    author: { ...author, verified: Boolean(author.verified) },
    page: page ? { ...page, verified: Boolean(page.verified) } : null,
    like_count: 0,
    comment_count: 0,
    liked_by_me: false,
  }
}

function mapLitePromo(row: Record<string, unknown>): GamePromo {
  return {
    id: String(row.id),
    author_id: String(row.author_id ?? ""),
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
    page: relation<GamePromo["page"]>(row.page),
  }
}

export async function getAdminAccounts() {
  if (!isSupabaseConfigured()) return [] as AdminAccount[]
  const viewer = await getViewer()
  if (!viewer?.isAdmin) return []
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_accounts")
  if (error || !Array.isArray(data)) return []
  return (data as AdminAccount[]).map((row) => ({
    id: String(row.id),
    email: String(row.email ?? ""),
    username: String(row.username ?? ""),
    display_name: String(row.display_name ?? ""),
    role: String(row.role ?? ""),
    created_at: String(row.created_at ?? ""),
  }))
}

export async function getReports() {
  if (!isSupabaseConfigured()) return [] as ReportRow[]
  const viewer = await getViewer()
  if (!viewer?.isAdmin) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, created_at, reporter:profiles!reporter_id (username, display_name)")
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) return []
  return (data ?? []).map((row) => {
    const record = row as unknown as Record<string, unknown>
    const reporter = relation<{ username?: string; display_name?: string }>(record.reporter)
    return {
      id: String(record.id),
      target_type: String(record.target_type),
      target_id: String(record.target_id),
      reason: String(record.reason ?? ""),
      created_at: String(record.created_at ?? ""),
      reporter_name: reporter?.display_name || "Member",
      reporter_username: reporter?.username || "",
    }
  })
}

export type AdminVerification = {
  kind: "profile" | "page"
  target_id: string
  label: string
  detail: string
  government_name: string
  verified_at: string
}

export async function getAdminVerifications() {
  const empty = { rows: [] as AdminVerification[], missing: false }
  if (!isSupabaseConfigured()) return empty
  const viewer = await getViewer()
  if (!viewer?.isAdmin) return empty
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("admin_list_verifications")
  if (error || !Array.isArray(data)) return { rows: [], missing: true }
  const rows = data.map((row) => {
    const record = row as {
      kind?: string
      target_id?: string
      label?: string
      detail?: string
      government_name?: string
      verified_at?: string
    }
    return {
      kind: record.kind === "page" ? "page" as const : "profile" as const,
      target_id: String(record.target_id ?? ""),
      label: String(record.label ?? ""),
      detail: String(record.detail ?? ""),
      government_name: String(record.government_name ?? ""),
      verified_at: String(record.verified_at ?? ""),
    }
  }).filter((row) => row.target_id)
  return { rows, missing: false }
}

export async function getProfileById(id: string) {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle()
  if (!data) return null
  return mapProfile(data as Record<string, unknown>)
}

export async function getPageForAdmin(ownerId: string) {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data } = await supabase.from("pages").select("*").eq("owner_id", ownerId).maybeSingle()
  return (data as (StudioPage & { featured?: boolean }) | null) ?? null
}
