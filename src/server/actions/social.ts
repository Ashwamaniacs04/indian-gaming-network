"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { friendlyDbError, textValue } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import type { ActionState } from "@/lib/types"
import { firstIssue, playtestSchema } from "@/lib/validators"

export async function followPage(formData: FormData) {
  const viewer = await requireUser()
  const pageId = textValue(formData, "page_id")
  const slug = textValue(formData, "slug")
  const supabase = await createClient()
  await supabase.from("page_follows").insert({ user_id: viewer.id, page_id: pageId })
  revalidatePath("/feed")
  revalidatePath("/notifications")
  if (slug) revalidatePath(`/p/${slug}`)
}

export async function unfollowPage(formData: FormData) {
  const viewer = await requireUser()
  const pageId = textValue(formData, "page_id")
  const slug = textValue(formData, "slug")
  const supabase = await createClient()
  await supabase.from("page_follows").delete().eq("user_id", viewer.id).eq("page_id", pageId)
  revalidatePath("/feed")
  if (slug) revalidatePath(`/p/${slug}`)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function refreshConnection(username: string) {
  if (/^[a-z0-9_]{3,20}$/.test(username)) revalidatePath(`/u/${username}`)
  revalidatePath("/notifications")
  revalidatePath("/feed")
}

export async function requestConnection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const profileId = textValue(formData, "profile_id")
  const username = textValue(formData, "username")
  if (!isUuid(profileId) || profileId === viewer.id) return { error: "Choose a person to connect with." }

  const supabase = await createClient()
  const { error } = await supabase.from("profile_connections").insert({
    requester_id: viewer.id,
    addressee_id: profileId,
    status: "pending",
  })
  if (error) {
    const raw = error.message.toLowerCase()
    if (raw.includes("profile_connections_undirected") || raw.includes("profile_connections_pair")) {
      refreshConnection(username)
      return null
    }
    return { error: friendlyDbError(error.message) }
  }
  refreshConnection(username)
  return null
}

export async function acceptConnection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const connectionId = textValue(formData, "connection_id")
  const username = textValue(formData, "username")
  if (!isUuid(connectionId)) return { error: "That request is no longer waiting." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profile_connections")
    .update({ status: "accepted" })
    .eq("id", connectionId)
    .eq("addressee_id", viewer.id)
    .eq("status", "pending")
    .select("id")
  if (error) return { error: friendlyDbError(error.message) }
  if (!data || data.length === 0) return { error: "That request is no longer waiting." }
  refreshConnection(username)
  return null
}

export async function removeConnection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const connectionId = textValue(formData, "connection_id")
  const username = textValue(formData, "username")
  if (!isUuid(connectionId)) return { error: "That connection is already gone." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profile_connections")
    .delete()
    .eq("id", connectionId)
    .or(`requester_id.eq.${viewer.id},addressee_id.eq.${viewer.id}`)
    .select("id")
  if (error) return { error: friendlyDbError(error.message) }
  if (!data || data.length === 0) return { error: "That connection is already gone." }
  refreshConnection(username)
  return null
}

export async function createPlaytest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  if (!viewer.page) return { error: "Create your studio page before posting a playtest." }

  const platforms = formData.getAll("platforms").filter((value): value is string => typeof value === "string")
  const parsed = playtestSchema.safeParse({
    title: textValue(formData, "title"),
    game_title: textValue(formData, "game_title"),
    description: textValue(formData, "description"),
    platforms,
    location_type: textValue(formData, "location_type"),
    city: textValue(formData, "city"),
    state: textValue(formData, "state"),
    compensation: textValue(formData, "compensation"),
    slots: textValue(formData, "slots"),
    deadline: textValue(formData, "deadline"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const slots = parsed.data.slots ? Number(parsed.data.slots) : null
  if (parsed.data.slots && (!Number.isInteger(slots) || (slots ?? 0) < 1)) {
    return { error: "Slots must be a whole number." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("playtest_listings").insert({
    page_id: viewer.page.id,
    author_id: viewer.id,
    title: parsed.data.title,
    game_title: parsed.data.game_title,
    description: parsed.data.description,
    platforms: parsed.data.platforms,
    location_type: parsed.data.location_type,
    city: parsed.data.city || null,
    state: parsed.data.state || null,
    compensation: parsed.data.compensation || null,
    slots,
    deadline: parsed.data.deadline || null,
    status: "open",
  })
  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath("/opportunities")
  revalidatePath(`/p/${viewer.page.slug}`)
  redirect("/opportunities?tab=playtests")
}

export async function setPlaytestStatus(formData: FormData) {
  const viewer = await requireUser()
  const id = textValue(formData, "id")
  const status = textValue(formData, "status") === "closed" ? "closed" : "open"
  const supabase = await createClient()
  await supabase.from("playtest_listings").update({ status }).eq("id", id).eq("author_id", viewer.id)
  revalidatePath("/opportunities")
}

export async function expressInterest(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const message = textValue(formData, "message").slice(0, 1000)
  const postId = textValue(formData, "post_id")
  const playtestId = textValue(formData, "playtest_id")
  if (!postId && !playtestId) return { error: "Choose something to respond to." }

  const supabase = await createClient()
  const { error } = await supabase.from("interests").insert({
    user_id: viewer.id,
    post_id: postId || null,
    playtest_id: playtestId || null,
    message,
    status: "pending",
  })
  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath("/opportunities")
  revalidatePath("/notifications")
  return { success: "Interest sent." }
}

export async function setInterestStatus(formData: FormData) {
  const viewer = await requireUser()
  const id = textValue(formData, "id")
  const status = textValue(formData, "status")
  if (status !== "accepted" && status !== "declined") return
  const supabase = await createClient()
  await supabase.from("interests").update({ status }).eq("id", id)
  revalidatePath("/opportunities")
  void viewer
}

export async function markNotificationsRead() {
  const viewer = await requireUser()
  const supabase = await createClient()
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", viewer.id)
    .is("read_at", null)
  revalidatePath("/notifications")
  revalidatePath("/feed")
}
