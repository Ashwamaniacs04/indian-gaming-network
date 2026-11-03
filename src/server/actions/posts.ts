"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { friendlyDbError, textValue } from "@/lib/format"
import { uploadImage } from "@/lib/media"
import { createClient } from "@/lib/supabase/server"
import type { ActionState, JobType } from "@/lib/types"
import { COLLAB_ROLES } from "@/lib/constants"
import { commentSchema, firstIssue, postSchema } from "@/lib/validators"
import { canonicalYoutubeUrl } from "@/lib/youtube"

export async function createPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const lookingFor = formData
    .getAll("collab_looking_for")
    .filter((value): value is string => typeof value === "string")
    .filter((value) => (COLLAB_ROLES as readonly string[]).includes(value))

  const parsed = postSchema.safeParse({
    post_type: textValue(formData, "post_type"),
    body: textValue(formData, "body"),
    youtube_url: textValue(formData, "youtube_url"),
    job_title: textValue(formData, "job_title"),
    job_location: textValue(formData, "job_location"),
    job_type: textValue(formData, "job_type") || undefined,
    collab_title: textValue(formData, "collab_title"),
    collab_looking_for: lookingFor,
    game_title: textValue(formData, "game_title"),
    as_page: formData.get("as_page") === "1",
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  let imagePath: string | null = null
  if (parsed.data.post_type === "image") {
    const uploaded = await uploadImage(supabase, "posts", viewer.id, formData.get("image"))
    if ("error" in uploaded && uploaded.error) return { error: uploaded.error }
    if (!uploaded.path) return { error: "Choose an image for this post." }
    imagePath = uploaded.path
  }

  const asPage = parsed.data.as_page && viewer.page ? viewer.page.id : null
  const youtube = parsed.data.post_type === "youtube" ? canonicalYoutubeUrl(parsed.data.youtube_url) : null

  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: viewer.id,
      page_id: asPage,
      post_type: parsed.data.post_type,
      body: parsed.data.body,
      image_path: parsed.data.post_type === "image" ? imagePath : null,
      youtube_url: youtube,
      job_title: parsed.data.post_type === "job" ? parsed.data.job_title : null,
      job_location: parsed.data.post_type === "job" ? parsed.data.job_location || null : null,
      job_type: parsed.data.post_type === "job" ? (parsed.data.job_type as JobType) : null,
      collab_title: parsed.data.post_type === "collab" ? parsed.data.collab_title : null,
      collab_looking_for: parsed.data.post_type === "collab" ? parsed.data.collab_looking_for : [],
      game_title: parsed.data.post_type === "collab" ? parsed.data.game_title || null : null,
    })
    .select("id")
    .single()

  if (error || !data) return { error: friendlyDbError(error?.message ?? "Could not publish the post.") }

  revalidatePath("/feed")
  revalidatePath("/opportunities")
  redirect(`/post/${(data as { id: string }).id}`)
}

export async function toggleLike(formData: FormData) {
  const viewer = await requireUser()
  const postId = textValue(formData, "post_id")
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", viewer.id)
    .maybeSingle()

  if (existing) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", viewer.id)
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: viewer.id })
  }
  revalidatePath("/feed")
  revalidatePath(`/post/${postId}`)
}

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  const parsed = commentSchema.safeParse({
    body: textValue(formData, "body"),
    post_id: textValue(formData, "post_id"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.from("post_comments").insert({
    post_id: parsed.data.post_id,
    author_id: viewer.id,
    body: parsed.data.body,
  })
  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath(`/post/${parsed.data.post_id}`)
  revalidatePath("/notifications")
  return { success: "Comment posted." }
}

export async function deleteComment(formData: FormData) {
  const viewer = await requireUser()
  const id = textValue(formData, "id")
  const postId = textValue(formData, "post_id")
  const supabase = await createClient()
  await supabase.from("post_comments").delete().eq("id", id).eq("author_id", viewer.id)
  revalidatePath(`/post/${postId}`)
}

export async function deletePost(formData: FormData) {
  const viewer = await requireUser()
  const id = textValue(formData, "id")
  const supabase = await createClient()
  await supabase.from("posts").delete().eq("id", id).eq("author_id", viewer.id)
  revalidatePath("/feed")
  redirect("/feed")
}
