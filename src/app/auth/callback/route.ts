import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { safeNextPath } from "@/lib/format"

type ServerClient = Awaited<ReturnType<typeof createClient>>

async function rememberProviderName(supabase: ServerClient) {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  const provider = user?.app_metadata?.provider
  if (!user || (provider !== "discord" && provider !== "google")) return

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarding_complete, socials")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile || profile.onboarding_complete) return

  const meta = user.user_metadata ?? {}
  const providerName = [meta.full_name, meta.name, meta.preferred_username].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  )
  const emailLocal = (user.email ?? "").split("@")[0]
  const updates: { display_name?: string; socials?: Record<string, string> } = {}
  if (providerName && emailLocal && profile.display_name === emailLocal) {
    updates.display_name = providerName.trim().slice(0, 80)
  }

  if (provider === "discord") {
    const socials =
      profile.socials && typeof profile.socials === "object" && !Array.isArray(profile.socials)
        ? (profile.socials as Record<string, unknown>)
        : {}
    const current = typeof socials.discord === "string" ? socials.discord.trim() : ""
    const handle = [meta.preferred_username, meta.name].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    )
    if (!current && handle) {
      updates.socials = {
        youtube: typeof socials.youtube === "string" ? socials.youtube : "",
        twitch: typeof socials.twitch === "string" ? socials.twitch : "",
        instagram: typeof socials.instagram === "string" ? socials.instagram : "",
        discord: handle.trim().slice(0, 80),
      }
    }
  }

  if (!updates.display_name && !updates.socials) return
  await supabase.from("profiles").update(updates).eq("id", user.id)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = safeNextPath(url.searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL("/login?error=link", url.origin))
    }
    await rememberProviderName(supabase)
    if (next === "/login/update-password") {
      return NextResponse.redirect(new URL(next, url.origin))
    }
    const { data } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", userId)
        .maybeSingle()
      const complete = Boolean((profile as { onboarding_complete?: boolean } | null)?.onboarding_complete)
      if (!complete) {
        return NextResponse.redirect(new URL("/onboarding", url.origin))
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
