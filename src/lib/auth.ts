import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { createClient } from "@/lib/supabase/server"
import type { Profile, Role, RoleDetails, Socials, Viewer, ViewerPage } from "@/lib/types"
import { isRole } from "@/lib/types"

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function mapProfile(row: Record<string, unknown>): Profile {
  const role = typeof row.role === "string" && isRole(row.role) ? row.role : "gamer"
  const socials = asRecord(row.socials)
  const details = asRecord(row.role_details)
  const years = details.years_experience
  const viewers = details.avg_viewers

  const roleDetails: RoleDetails = {
    platforms: asStringArray(details.platforms),
    favorite_games: asStringArray(details.favorite_games),
    games_tested: asStringArray(details.games_tested),
    years_experience: typeof years === "number" ? years : null,
    schedule: typeof details.schedule === "string" ? details.schedule : "",
    avg_viewers: typeof viewers === "number" ? viewers : null,
    conventions: asStringArray(details.conventions),
    characters: asStringArray(details.characters),
  }

  const social: Socials = {
    youtube: typeof socials.youtube === "string" ? socials.youtube : "",
    twitch: typeof socials.twitch === "string" ? socials.twitch : "",
    instagram: typeof socials.instagram === "string" ? socials.instagram : "",
    discord: typeof socials.discord === "string" ? socials.discord : "",
  }

  return {
    id: String(row.id),
    username: String(row.username),
    display_name: String(row.display_name),
    role,
    headline: (row.headline as string | null) ?? null,
    about: (row.about as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    state: (row.state as string | null) ?? null,
    avatar_path: (row.avatar_path as string | null) ?? null,
    banner_path: (row.banner_path as string | null) ?? null,
    skills: asStringArray(row.skills),
    website: (row.website as string | null) ?? null,
    contact_email: (row.contact_email as string | null) ?? null,
    availability: (row.availability as string | null) ?? null,
    socials: social,
    role_details: roleDetails,
    onboarding_complete: Boolean(row.onboarding_complete),
  }
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  await cookies()
  if (!isSupabaseConfigured()) return null

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (error || !userId) return null

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()

  if (!profileRow) return null

  const { data: pageRow } = await supabase
    .from("pages")
    .select("id, slug, name, logo_path")
    .eq("owner_id", userId)
    .maybeSingle()

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null)

  const page = pageRow as ViewerPage | null

  return {
    id: userId,
    profile: mapProfile(profileRow as Record<string, unknown>),
    page: page
      ? {
          id: page.id,
          slug: page.slug,
          name: page.name,
          logo_path: page.logo_path,
        }
      : null,
    unread: count ?? 0,
  }
})

export async function requireUser() {
  const viewer = await getViewer()
  if (!viewer) redirect("/login")
  return viewer
}

export function roleDetailsFromProfile(role: Role, profile: Profile) {
  return { role, details: profile.role_details }
}
