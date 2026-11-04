import { getViewer } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import type {
  CommentItem,
  ExperienceItem,
  InterestInboxItem,
  NotificationItem,
  PlaytestCard,
  PortfolioItem,
  PostCard,
  PostType,
  Profile,
  Role,
  StudioPage,
} from "@/lib/types"
import { mapProfile } from "@/lib/auth"

function relation<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null
  if (value && typeof value === "object") return value as T
  return null
}

function countOf(value: unknown) {
  if (!value) return 0
  if (Array.isArray(value)) {
    const first = value[0] as { count?: number } | undefined
    return first?.count ?? 0
  }
  if (typeof value === "object" && value && "count" in value) {
    return Number((value as { count: number }).count) || 0
  }
  return 0
}

function mapPost(row: Record<string, unknown>, liked: Set<string>): PostCard {
  const author = relation<PostCard["author"]>(row.author) ?? {
    username: "member",
    display_name: "Member",
    avatar_path: null,
    headline: null,
    role: "gamer",
  }
  const page = relation<NonNullable<PostCard["page"]>>(row.page)
  return {
    id: String(row.id),
    post_type: row.post_type as PostType,
    body: String(row.body ?? ""),
    image_path: (row.image_path as string | null) ?? null,
    youtube_url: (row.youtube_url as string | null) ?? null,
    job_title: (row.job_title as string | null) ?? null,
    job_location: (row.job_location as string | null) ?? null,
    job_type: (row.job_type as PostCard["job_type"]) ?? null,
    collab_title: (row.collab_title as string | null) ?? null,
    collab_looking_for: Array.isArray(row.collab_looking_for)
      ? (row.collab_looking_for as string[])
      : [],
    game_title: (row.game_title as string | null) ?? null,
    created_at: String(row.created_at),
    author,
    page,
    like_count: countOf(row.likes),
    comment_count: countOf(row.comments),
    liked_by_me: liked.has(String(row.id)),
  }
}

const POST_SELECT = `
  id, post_type, body, image_path, youtube_url, job_title, job_location, job_type,
  collab_title, collab_looking_for, game_title, created_at,
  author:profiles!author_id (username, display_name, avatar_path, headline, role),
  page:pages!page_id (slug, name, logo_path),
  likes:post_likes(count),
  comments:post_comments(count)
`

async function withLikes(rows: Record<string, unknown>[]) {
  const viewer = await getViewer()
  const ids = rows.map((row) => String(row.id))
  const liked = new Set<string>()
  if (viewer && ids.length > 0 && isSupabaseConfigured()) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", viewer.id)
      .in("post_id", ids)
    for (const row of data ?? []) {
      liked.add(String((row as { post_id: string }).post_id))
    }
  }
  return rows.map((row) => mapPost(row, liked))
}

export async function getFeed(scope: string) {
  if (!isSupabaseConfigured()) return { posts: [] as PostCard[], following: false }
  const supabase = await createClient()
  const viewer = await getViewer()
  let query = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false }).limit(30)

  if (scope === "following") {
    if (!viewer) return { posts: [] as PostCard[], following: true }
    const { data: follows } = await supabase
      .from("page_follows")
      .select("page_id")
      .eq("user_id", viewer.id)
    const pageIds = (follows ?? []).map((row) => (row as { page_id: string }).page_id)
    if (pageIds.length === 0) return { posts: [] as PostCard[], following: true }
    query = query.in("page_id", pageIds)
  }

  const { data } = await query
  return { posts: await withLikes((data ?? []) as Record<string, unknown>[]), following: scope === "following" }
}

export async function getPost(id: string) {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data } = await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle()
  if (!data) return null
  const [post] = await withLikes([data as Record<string, unknown>])
  return post
}

export async function getComments(postId: string) {
  if (!isSupabaseConfigured()) return [] as CommentItem[]
  const supabase = await createClient()
  const { data } = await supabase
    .from("post_comments")
    .select("id, body, created_at, author_id, author:profiles!author_id (username, display_name, avatar_path)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
  return (data ?? []).map((row) => {
    const record = row as unknown as Record<string, unknown>
    const author = relation<CommentItem["author"]>(record.author) ?? {
      username: "member",
      display_name: "Member",
      avatar_path: null,
    }
    return {
      id: String(record.id),
      body: String(record.body ?? ""),
      created_at: String(record.created_at),
      author_id: String(record.author_id),
      author,
    }
  })
}

export async function getProfileByUsername(username: string) {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle()
  if (!data) return null
  return mapProfile(data as Record<string, unknown>)
}

export async function getPageByOwner(ownerId: string) {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data } = await supabase.from("pages").select("*").eq("owner_id", ownerId).maybeSingle()
  return (data as StudioPage | null) ?? null
}

export async function getPageBySlug(slug: string) {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const { data } = await supabase.from("pages").select("*").eq("slug", slug).maybeSingle()
  return (data as StudioPage | null) ?? null
}

export async function getPortfolio(profileId: string) {
  if (!isSupabaseConfigured()) return [] as PortfolioItem[]
  const supabase = await createClient()
  const { data } = await supabase
    .from("portfolio_items")
    .select("id, title, caption, media_path, external_url")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
  return (data ?? []) as PortfolioItem[]
}

export async function getExperience(profileId: string) {
  if (!isSupabaseConfigured()) return [] as ExperienceItem[]
  const supabase = await createClient()
  const { data } = await supabase
    .from("experience_items")
    .select("id, title, organization, game_title, start_date, end_date, description")
    .eq("profile_id", profileId)
    .order("start_date", { ascending: false })
  return (data ?? []) as ExperienceItem[]
}

export async function getPostsByAuthor(authorId: string) {
  if (!isSupabaseConfigured()) return [] as PostCard[]
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("author_id", authorId)
    .is("page_id", null)
    .order("created_at", { ascending: false })
    .limit(20)
  return withLikes((data ?? []) as Record<string, unknown>[])
}

export async function getPostsByPage(pageId: string) {
  if (!isSupabaseConfigured()) return [] as PostCard[]
  const supabase = await createClient()
  const { data } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("page_id", pageId)
    .order("created_at", { ascending: false })
    .limit(20)
  return withLikes((data ?? []) as Record<string, unknown>[])
}

export async function getFollowState(pageId: string) {
  if (!isSupabaseConfigured()) return { count: 0, following: false }
  const supabase = await createClient()
  const viewer = await getViewer()
  const { count } = await supabase
    .from("page_follows")
    .select("user_id", { count: "exact", head: true })
    .eq("page_id", pageId)
  let following = false
  if (viewer) {
    const { data } = await supabase
      .from("page_follows")
      .select("page_id")
      .eq("page_id", pageId)
      .eq("user_id", viewer.id)
      .maybeSingle()
    following = Boolean(data)
  }
  return { count: count ?? 0, following }
}

const PLAYTEST_SELECT = `
  id, title, game_title, description, platforms, location_type, city, state,
  compensation, slots, deadline, status, created_at,
  page:pages!page_id (slug, name, logo_path)
`

export async function getPlaytests(filters: { q?: string; state?: string; location?: string; mine?: boolean }) {
  if (!isSupabaseConfigured()) return [] as PlaytestCard[]
  const supabase = await createClient()
  const viewer = await getViewer()
  let query = supabase.from("playtest_listings").select(PLAYTEST_SELECT).order("created_at", { ascending: false }).limit(40)
  if (!filters.mine) query = query.eq("status", "open")
  if (filters.mine && viewer?.page) query = query.eq("page_id", viewer.page.id)
  if (filters.mine && !viewer?.page) return []
  if (filters.state) query = query.eq("state", filters.state)
  if (filters.location) query = query.eq("location_type", filters.location)
  if (filters.q) {
    const term = filters.q.replace(/[%_,]/g, " ").trim()
    if (term) query = query.or(`title.ilike.%${term}%,game_title.ilike.%${term}%`)
  }
  const { data } = await query
  return (data ?? []).map((row) => mapPlaytest(row as unknown as Record<string, unknown>)).filter((row): row is PlaytestCard => row !== null)
}

export async function getPlaytestsByPage(pageId: string) {
  if (!isSupabaseConfigured()) return [] as PlaytestCard[]
  const supabase = await createClient()
  const { data } = await supabase
    .from("playtest_listings")
    .select(PLAYTEST_SELECT)
    .eq("page_id", pageId)
    .order("created_at", { ascending: false })
  return (data ?? []).map((row) => mapPlaytest(row as unknown as Record<string, unknown>)).filter((row): row is PlaytestCard => row !== null)
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
    page,
  }
}

export async function getOpportunityPosts(type: "job" | "collab", q?: string) {
  if (!isSupabaseConfigured()) return [] as PostCard[]
  const supabase = await createClient()
  let query = supabase.from("posts").select(POST_SELECT).eq("post_type", type).order("created_at", { ascending: false }).limit(40)
  if (q) {
    const term = q.replace(/[%_,]/g, " ").trim()
    if (term) {
      const column = type === "job" ? "job_title" : "collab_title"
      query = query.or(`${column}.ilike.%${term}%,body.ilike.%${term}%`)
    }
  }
  const { data } = await query
  return withLikes((data ?? []) as Record<string, unknown>[])
}

export async function getInterestInbox() {
  if (!isSupabaseConfigured()) return [] as InterestInboxItem[]
  const viewer = await getViewer()
  if (!viewer) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("interest_inbox")
    .select("id, message, status, created_at, kind, target_title, applicant_name, applicant_username, applicant_avatar_path")
    .eq("owner_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(50)
  return (data ?? []) as InterestInboxItem[]
}

export async function searchPeople(filters: { q?: string; role?: string; state?: string }) {
  if (!isSupabaseConfigured()) return [] as Profile[]
  const supabase = await createClient()
  let query = supabase
    .from("profiles")
    .select("*")
    .eq("onboarding_complete", true)
    .order("created_at", { ascending: false })
    .limit(24)
  if (filters.role) query = query.eq("role", filters.role)
  if (filters.state) query = query.eq("state", filters.state)
  if (filters.q) {
    const term = filters.q.replace(/[%_,]/g, " ").trim()
    if (term) query = query.or(`display_name.ilike.%${term}%,username.ilike.%${term}%,headline.ilike.%${term}%`)
  }
  const { data } = await query
  return (data ?? []).map((row) => mapProfile(row as Record<string, unknown>))
}

export async function studioPagesFor(ownerIds: string[]) {
  if (!isSupabaseConfigured() || ownerIds.length === 0) return [] as Array<{ owner_id: string; slug: string; name: string }>
  const supabase = await createClient()
  const { data } = await supabase.from("pages").select("owner_id, slug, name").in("owner_id", ownerIds)
  return (data ?? []) as Array<{ owner_id: string; slug: string; name: string }>
}

export async function searchPages(filters: { q?: string; state?: string }) {
  if (!isSupabaseConfigured()) return [] as StudioPage[]
  const supabase = await createClient()
  let query = supabase.from("pages").select("*").order("created_at", { ascending: false }).limit(24)
  if (filters.state) query = query.eq("state", filters.state)
  if (filters.q) {
    const term = filters.q.replace(/[%_,]/g, " ").trim()
    if (term) query = query.or(`name.ilike.%${term}%,headline.ilike.%${term}%`)
  }
  const { data } = await query
  return (data ?? []) as StudioPage[]
}

export async function searchPosts(filters: { q?: string; postType?: string }) {
  if (!isSupabaseConfigured()) return [] as PostCard[]
  const supabase = await createClient()
  let query = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false }).limit(24)
  if (filters.postType) query = query.eq("post_type", filters.postType)
  if (filters.q) {
    const term = filters.q.replace(/[%_,]/g, " ").trim()
    if (term) {
      query = query.or(
        `body.ilike.%${term}%,job_title.ilike.%${term}%,collab_title.ilike.%${term}%,game_title.ilike.%${term}%`,
      )
    }
  }
  const { data } = await query
  return withLikes((data ?? []) as Record<string, unknown>[])
}

export async function getNotifications() {
  if (!isSupabaseConfigured()) return [] as NotificationItem[]
  const viewer = await getViewer()
  if (!viewer) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("notifications")
    .select("id, type, entity_id, read_at, created_at, actor:profiles!actor_id (username, display_name)")
    .eq("recipient_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(40)
  return (data ?? []).map((row) => {
    const record = row as unknown as Record<string, unknown>
    return {
      id: String(record.id),
      type: record.type as NotificationItem["type"],
      entity_id: String(record.entity_id),
      read_at: (record.read_at as string | null) ?? null,
      created_at: String(record.created_at),
      actor: relation<NonNullable<NotificationItem["actor"]>>(record.actor),
    }
  })
}

export async function getSuggestions() {
  const empty = {
    pages: [] as Array<StudioPage & { following: boolean }>,
    playtests: [] as PlaytestCard[],
  }
  if (!isSupabaseConfigured()) return empty
  const supabase = await createClient()
  const viewer = await getViewer()
  const { data: pages } = await supabase
    .from("pages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(6)

  let followed = new Set<string>()
  if (viewer) {
    const { data: follows } = await supabase.from("page_follows").select("page_id").eq("user_id", viewer.id)
    followed = new Set((follows ?? []).map((row) => (row as { page_id: string }).page_id))
  }

  const suggestions = ((pages ?? []) as StudioPage[])
    .filter((page) => page.owner_id !== viewer?.id)
    .slice(0, 4)
    .map((page) => ({ ...page, following: followed.has(page.id) }))

  const { data: playtests } = await supabase
    .from("playtest_listings")
    .select(PLAYTEST_SELECT)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(3)

  return {
    pages: suggestions,
    playtests: (playtests ?? [])
      .map((row) => mapPlaytest(row as unknown as Record<string, unknown>))
      .filter((row): row is PlaytestCard => row !== null),
  }
}

export function isRoleFilter(value: string | undefined): value is Role {
  return value === "gamer" || value === "tester" || value === "studio" || value === "streamer" || value === "cosplay_artist"
}
