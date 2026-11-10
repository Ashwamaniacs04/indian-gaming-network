"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { friendlyDbError, textValue } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import type { ActionState } from "@/lib/types"
import { INDIAN_STATES } from "@/lib/constants"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function saveListing(formData: FormData) {
  const viewer = await requireUser()
  const targetType = textValue(formData, "target_type")
  const targetId = textValue(formData, "target_id")
  if ((targetType !== "playtest" && targetType !== "post") || !isUuid(targetId)) return
  const supabase = await createClient()
  const { data } = await supabase
    .from("saved_listings")
    .select("target_id")
    .eq("user_id", viewer.id)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle()
  if (data) {
    await supabase.from("saved_listings").delete().eq("user_id", viewer.id).eq("target_type", targetType).eq("target_id", targetId)
  } else {
    await supabase.from("saved_listings").insert({ user_id: viewer.id, target_type: targetType, target_id: targetId })
  }
  revalidatePath("/opportunities")
}

export async function markPostFilled(formData: FormData) {
  const viewer = await requireUser()
  const postId = textValue(formData, "post_id")
  if (!isUuid(postId)) return
  const supabase = await createClient()
  await supabase.from("posts").update({ closed_at: new Date().toISOString() }).eq("id", postId).eq("author_id", viewer.id)
  revalidatePath("/feed")
  revalidatePath("/opportunities")
  revalidatePath("/search")
}

export async function pinPost(formData: FormData) {
  const viewer = await requireUser()
  const postId = textValue(formData, "post_id")
  const scope = textValue(formData, "scope")
  if (!isUuid(postId)) return
  const clear = formData.get("clear") === "1"
  const supabase = await createClient()
  const value = clear ? null : postId
  if (scope === "page" && viewer.page) {
    await supabase.from("pages").update({ pinned_post_id: value }).eq("id", viewer.page.id)
    revalidatePath(`/p/${viewer.page.slug}`)
  } else {
    await supabase.from("profiles").update({ pinned_post_id: value }).eq("id", viewer.id)
    revalidatePath(`/u/${viewer.profile.username}`)
  }
}

export async function reportContent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const targetType = textValue(formData, "target_type")
  const targetId = textValue(formData, "target_id")
  const reason = textValue(formData, "reason")
  if ((targetType !== "post" && targetType !== "profile") || !isUuid(targetId)) return { error: "Choose something to report." }
  if (reason.length < 3) return { error: "Add a short reason." }
  const supabase = await createClient()
  const { error } = await supabase.from("reports").insert({
    reporter_id: viewer.id,
    target_type: targetType,
    target_id: targetId,
    reason: reason.slice(0, 500),
  })
  if (error) return { error: friendlyDbError(error.message) }
  return { success: "Report sent." }
}

export async function followGame(formData: FormData) {
  const viewer = await requireUser()
  const gameName = textValue(formData, "game_name").slice(0, 80)
  const gameKey = gameName.toLowerCase()
  if (gameKey.length < 2) return
  const supabase = await createClient()
  const { data } = await supabase.from("game_follows").select("game_key").eq("user_id", viewer.id).eq("game_key", gameKey).maybeSingle()
  if (data) await supabase.from("game_follows").delete().eq("user_id", viewer.id).eq("game_key", gameKey)
  else await supabase.from("game_follows").insert({ user_id: viewer.id, game_key: gameKey, game_name: gameName })
  revalidatePath("/games")
}

export async function addPageMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  if (!viewer.page) return { error: "Create a studio page first." }
  const username = textValue(formData, "username").toLowerCase()
  const supabase = await createClient()
  const { data: profile } = await supabase.from("profiles").select("id").eq("username", username).maybeSingle()
  if (!profile) return { error: "No profile uses that username." }
  const { error } = await supabase.from("page_members").insert({ page_id: viewer.page.id, profile_id: (profile as { id: string }).id })
  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath(`/p/${viewer.page.slug}`)
  return { success: "Added to the team." }
}

export async function removePageMember(formData: FormData) {
  const viewer = await requireUser()
  if (!viewer.page) return
  const profileId = textValue(formData, "profile_id")
  if (!isUuid(profileId)) return
  const supabase = await createClient()
  await supabase.from("page_members").delete().eq("page_id", viewer.page.id).eq("profile_id", profileId)
  revalidatePath(`/p/${viewer.page.slug}`)
}

export async function createMeetup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const name = textValue(formData, "name")
  const city = textValue(formData, "city")
  const state = textValue(formData, "state")
  const place = textValue(formData, "place")
  const starts = textValue(formData, "starts_at")
  const spots = Number(textValue(formData, "spots"))
  const note = textValue(formData, "note")
  if (name.length < 3) return { error: "Name the meetup." }
  if (!(INDIAN_STATES as readonly string[]).includes(state)) return { error: "Choose a state." }
  if (city.length < 2 || place.length < 2) return { error: "Add a city and a place." }
  if (!starts) return { error: "Choose a date and time." }
  if (!Number.isFinite(spots) || spots < 2 || spots > 200) return { error: "Spots must be between 2 and 200." }
  if (note.length < 10) return { error: "Describe the meetup in a sentence." }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("meetups")
    .insert({ host_id: viewer.id, name, city: `${city}, ${state}`, place, starts_at: new Date(starts).toISOString(), spots, note })
    .select("id")
    .single()
  if (error || !data) return { error: friendlyDbError(error?.message ?? "Could not create the meetup.") }
  redirect(`/meetups/${(data as { id: string }).id}`)
}

export async function requestMeetupSpot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const meetupId = textValue(formData, "meetup_id")
  const why = textValue(formData, "why")
  const attend = formData.get("attend") === "1"
  if (!isUuid(meetupId)) return { error: "Choose a meetup." }
  if (!attend) return { error: "Confirm that you will attend in person." }
  if (why.length < 3) return { error: "Say why you are coming." }
  const supabase = await createClient()
  const { error } = await supabase.from("meetup_requests").insert({
    meetup_id: meetupId,
    profile_id: viewer.id,
    why,
    status: "pending",
  })
  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath(`/meetups/${meetupId}`)
  return { success: "Request sent. The host will accept or decline it." }
}

export async function reviewMeetupRequest(formData: FormData) {
  const viewer = await requireUser()
  const requestId = textValue(formData, "request_id")
  const meetupId = textValue(formData, "meetup_id")
  const status = textValue(formData, "status")
  if (!isUuid(requestId) || !isUuid(meetupId)) return
  if (status !== "accepted" && status !== "declined" && status !== "cancelled") return
  const supabase = await createClient()
  const { data: meetup } = await supabase.from("meetups").select("spots, host_id").eq("id", meetupId).maybeSingle()
  const hostId = (meetup as { spots?: number; host_id?: string } | null)?.host_id
  if (status === "cancelled") {
    await supabase.from("meetup_requests").update({ status }).eq("id", requestId).eq("profile_id", viewer.id)
    revalidatePath(`/meetups/${meetupId}`)
    return
  }
  if (hostId !== viewer.id) return
  if (status === "accepted") {
    const { count } = await supabase
      .from("meetup_requests")
      .select("id", { count: "exact", head: true })
      .eq("meetup_id", meetupId)
      .eq("status", "accepted")
    const spots = (meetup as { spots?: number } | null)?.spots ?? 0
    if ((count ?? 0) >= spots) return
  }
  await supabase.from("meetup_requests").update({ status }).eq("id", requestId)
  revalidatePath(`/meetups/${meetupId}`)
}

export async function adminUpdateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  if (!viewer.isAdmin) return { error: "You do not have permission to do that." }
  const targetId = textValue(formData, "target_id")
  if (!isUuid(targetId)) return { error: "Choose an account." }
  const displayName = textValue(formData, "display_name")
  if (displayName.length < 2) return { error: "Add a name." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_update_profile", {
    target_id: targetId,
    p_display_name: displayName,
    p_headline: textValue(formData, "headline"),
    p_about: textValue(formData, "about"),
    p_city: textValue(formData, "city"),
    p_state: textValue(formData, "state"),
    p_looking_for: textValue(formData, "looking_for"),
  })
  if (error) return { error: friendlyDbError(error.message) }
  const username = textValue(formData, "username")
  revalidatePath("/admin")
  revalidatePath(`/admin/${targetId}`)
  if (username) revalidatePath(`/u/${username}`)
  return { success: "Profile updated." }
}

export async function adminUpdatePage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  if (!viewer.isAdmin) return { error: "You do not have permission to do that." }
  const pageId = textValue(formData, "page_id")
  if (!isUuid(pageId)) return { error: "Choose a page." }
  const name = textValue(formData, "name")
  if (name.length < 2) return { error: "Add a page name." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_update_page", {
    page_id: pageId,
    p_name: name,
    p_headline: textValue(formData, "headline"),
    p_about: textValue(formData, "about"),
    p_city: textValue(formData, "city"),
    p_state: textValue(formData, "state"),
    p_featured: formData.get("featured") === "1",
  })
  if (error) return { error: friendlyDbError(error.message) }
  const slug = textValue(formData, "slug")
  revalidatePath("/admin")
  if (slug) revalidatePath(`/p/${slug}`)
  return { success: "Page updated." }
}

export async function adminDeleteLogin(formData: FormData) {
  const viewer = await requireUser()
  if (!viewer.isAdmin) return
  const targetId = textValue(formData, "target_id")
  if (!isUuid(targetId) || targetId === viewer.id) return
  const supabase = await createClient()
  await supabase.rpc("admin_delete_login", { target_id: targetId })
  revalidatePath("/admin")
}
