"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { friendlyDbError, splitList, textValue } from "@/lib/format"
import { monthToDate, uploadImage } from "@/lib/media"
import { createClient } from "@/lib/supabase/server"
import type { ActionState, Role } from "@/lib/types"
import { isRole } from "@/lib/types"
import {
  experienceSchema,
  firstIssue,
  onboardingSchema,
  pageSchema,
  portfolioSchema,
  profileSchema,
} from "@/lib/validators"

function emptyToNull(value: string) {
  return value.length > 0 ? value : null
}

export async function completeOnboarding(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const parsed = onboardingSchema.safeParse({
    role: textValue(formData, "role"),
    username: textValue(formData, "username"),
    headline: textValue(formData, "headline"),
    state: textValue(formData, "state"),
    city: textValue(formData, "city"),
    about: textValue(formData, "about"),
    page_name: textValue(formData, "page_name"),
    page_slug: textValue(formData, "page_slug"),
    page_about: textValue(formData, "page_about"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({
      role: parsed.data.role,
      username: parsed.data.username,
      headline: parsed.data.headline,
      state: parsed.data.state,
      city: parsed.data.city,
      about: parsed.data.about,
      onboarding_complete: true,
    })
    .eq("id", viewer.id)

  if (error) return { error: friendlyDbError(error.message) }

  if (parsed.data.role === "studio" && !viewer.page) {
    const { error: pageError } = await supabase.from("pages").insert({
      owner_id: viewer.id,
      name: parsed.data.page_name?.trim(),
      slug: parsed.data.page_slug?.trim().toLowerCase(),
      about: parsed.data.page_about,
      city: parsed.data.city,
      state: parsed.data.state,
      page_type: "studio",
    })
    if (pageError) {
      await supabase.from("profiles").update({ onboarding_complete: false }).eq("id", viewer.id)
      return { error: friendlyDbError(pageError.message) }
    }
  }

  redirect("/feed")
}

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const platforms = formData.getAll("platforms").filter((value): value is string => typeof value === "string")
  const parsed = profileSchema.safeParse({
    display_name: textValue(formData, "display_name"),
    headline: textValue(formData, "headline"),
    about: textValue(formData, "about"),
    state: textValue(formData, "state"),
    city: textValue(formData, "city"),
    website: textValue(formData, "website"),
    contact_email: textValue(formData, "contact_email"),
    availability: textValue(formData, "availability"),
    skills: textValue(formData, "skills"),
    youtube: textValue(formData, "youtube"),
    twitch: textValue(formData, "twitch"),
    instagram: textValue(formData, "instagram"),
    discord: textValue(formData, "discord"),
    platforms,
    favorite_games: textValue(formData, "favorite_games"),
    games_tested: textValue(formData, "games_tested"),
    years_experience: textValue(formData, "years_experience"),
    schedule: textValue(formData, "schedule"),
    avg_viewers: textValue(formData, "avg_viewers"),
    conventions: textValue(formData, "conventions"),
    characters: textValue(formData, "characters"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const avatar = await uploadImage(supabase, "avatars", viewer.id, formData.get("avatar"))
  if ("error" in avatar && avatar.error) return { error: avatar.error }
  const banner = await uploadImage(supabase, "banners", viewer.id, formData.get("banner"))
  if ("error" in banner && banner.error) return { error: banner.error }

  const years = parsed.data.years_experience ? Number(parsed.data.years_experience) : null
  const viewers = parsed.data.avg_viewers ? Number(parsed.data.avg_viewers) : null

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      headline: emptyToNull(parsed.data.headline),
      about: emptyToNull(parsed.data.about),
      state: emptyToNull(parsed.data.state),
      city: emptyToNull(parsed.data.city),
      website: emptyToNull(parsed.data.website),
      contact_email: emptyToNull(parsed.data.contact_email),
      availability: emptyToNull(parsed.data.availability),
      skills: splitList(parsed.data.skills),
      avatar_path: avatar.path ?? viewer.profile.avatar_path,
      banner_path: banner.path ?? viewer.profile.banner_path,
      socials: {
        youtube: parsed.data.youtube,
        twitch: parsed.data.twitch,
        instagram: parsed.data.instagram,
        discord: parsed.data.discord,
      },
      role_details: {
        platforms: parsed.data.platforms,
        favorite_games: splitList(parsed.data.favorite_games),
        games_tested: splitList(parsed.data.games_tested),
        years_experience: Number.isFinite(years) ? years : null,
        schedule: parsed.data.schedule,
        avg_viewers: Number.isFinite(viewers) ? viewers : null,
        conventions: splitList(parsed.data.conventions),
        characters: splitList(parsed.data.characters),
      },
    })
    .eq("id", viewer.id)

  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath("/settings")
  revalidatePath(`/u/${viewer.profile.username}`)
  return { success: "Profile saved." }
}

export async function updateRole(formData: FormData) {
  const viewer = await requireUser()
  const role = textValue(formData, "role")
  if (!isRole(role)) return
  const supabase = await createClient()
  await supabase.from("profiles").update({ role: role satisfies Role }).eq("id", viewer.id)
  revalidatePath("/settings")
  redirect("/settings")
}

export async function savePage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  if (viewer.profile.role !== "studio") return { error: "Only studio accounts can edit a page." }

  const parsed = pageSchema.safeParse({
    name: textValue(formData, "name"),
    slug: textValue(formData, "slug"),
    headline: textValue(formData, "headline"),
    about: textValue(formData, "about"),
    state: textValue(formData, "state"),
    city: textValue(formData, "city"),
    website: textValue(formData, "website"),
    contact_email: textValue(formData, "contact_email"),
    games: textValue(formData, "games"),
    specialties: textValue(formData, "specialties"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const logo = await uploadImage(supabase, "avatars", viewer.id, formData.get("logo"))
  if ("error" in logo && logo.error) return { error: logo.error }
  const banner = await uploadImage(supabase, "banners", viewer.id, formData.get("banner"))
  if ("error" in banner && banner.error) return { error: banner.error }

  const payload = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    headline: emptyToNull(parsed.data.headline),
    about: emptyToNull(parsed.data.about),
    state: emptyToNull(parsed.data.state),
    city: emptyToNull(parsed.data.city),
    website: emptyToNull(parsed.data.website),
    contact_email: emptyToNull(parsed.data.contact_email),
    games: splitList(parsed.data.games),
    specialties: splitList(parsed.data.specialties),
    logo_path: logo.path ?? undefined,
    banner_path: banner.path ?? undefined,
  }

  const { error } = viewer.page
    ? await supabase.from("pages").update(payload).eq("id", viewer.page.id)
    : await supabase.from("pages").insert({ ...payload, owner_id: viewer.id, page_type: "studio" })

  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath("/page/edit")
  revalidatePath(`/p/${parsed.data.slug}`)
  redirect(`/p/${parsed.data.slug}`)
}

export async function addPortfolio(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const parsed = portfolioSchema.safeParse({
    title: textValue(formData, "title"),
    caption: textValue(formData, "caption"),
    external_url: textValue(formData, "external_url"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const media = await uploadImage(supabase, "portfolio", viewer.id, formData.get("media"))
  if ("error" in media && media.error) return { error: media.error }

  const { error } = await supabase.from("portfolio_items").insert({
    profile_id: viewer.id,
    title: parsed.data.title,
    caption: emptyToNull(parsed.data.caption),
    external_url: emptyToNull(parsed.data.external_url),
    media_path: media.path,
  })
  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath("/settings")
  revalidatePath(`/u/${viewer.profile.username}`)
  return { success: "Portfolio item added." }
}

export async function deletePortfolio(formData: FormData) {
  const viewer = await requireUser()
  const id = textValue(formData, "id")
  const supabase = await createClient()
  await supabase.from("portfolio_items").delete().eq("id", id).eq("profile_id", viewer.id)
  revalidatePath("/settings")
  revalidatePath(`/u/${viewer.profile.username}`)
}

export async function addExperience(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const parsed = experienceSchema.safeParse({
    title: textValue(formData, "title"),
    organization: textValue(formData, "organization"),
    game_title: textValue(formData, "game_title"),
    start_date: textValue(formData, "start_date"),
    end_date: textValue(formData, "end_date"),
    description: textValue(formData, "description"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.from("experience_items").insert({
    profile_id: viewer.id,
    title: parsed.data.title,
    organization: emptyToNull(parsed.data.organization),
    game_title: emptyToNull(parsed.data.game_title),
    start_date: monthToDate(parsed.data.start_date),
    end_date: monthToDate(parsed.data.end_date),
    description: emptyToNull(parsed.data.description),
  })
  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath("/settings")
  revalidatePath(`/u/${viewer.profile.username}`)
  return { success: "Experience added." }
}

export async function deleteExperience(formData: FormData) {
  const viewer = await requireUser()
  const id = textValue(formData, "id")
  const supabase = await createClient()
  await supabase.from("experience_items").delete().eq("id", id).eq("profile_id", viewer.id)
  revalidatePath("/settings")
  revalidatePath(`/u/${viewer.profile.username}`)
}
