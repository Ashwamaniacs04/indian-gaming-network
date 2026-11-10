"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { friendlyDbError, textValue } from "@/lib/format"
import { PROMO_PRICE_PAISE, promoPaymentsReady } from "@/lib/promo"
import { createClient } from "@/lib/supabase/server"
import type { ActionState } from "@/lib/types"
import { firstIssue, promoSchema } from "@/lib/validators"
import { canonicalYoutubeUrl } from "@/lib/youtube"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function razorpayAuth() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) return null
  return { keyId, keySecret, token: Buffer.from(`${keyId}:${keySecret}`).toString("base64") }
}

async function razorpay(path: string, init?: RequestInit) {
  const auth = razorpayAuth()
  if (!auth) throw new Error("Payment is not set up")
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth.token}`,
      "Content-Type": "application/json",
    },
  })
  const body = (await response.json()) as { error?: { description?: string } }
  if (!response.ok) {
    throw new Error(body.error?.description || "Payment could not be started")
  }
  return body as Record<string, unknown>
}

export async function createGamePromo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  if (!viewer.page || viewer.profile.role !== "studio") {
    return { error: "Only a studio page can post an upcoming game." }
  }

  const platforms = formData.getAll("platforms").filter((value): value is string => typeof value === "string")
  const parsed = promoSchema.safeParse({
    game_title: textValue(formData, "game_title"),
    body: textValue(formData, "body"),
    youtube_url: textValue(formData, "youtube_url"),
    platforms,
    release_label: textValue(formData, "release_label"),
    genre: textValue(formData, "genre"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const youtube = canonicalYoutubeUrl(parsed.data.youtube_url)
  if (!youtube) return { error: "Use a YouTube link for the trailer." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("game_promos")
    .insert({
      page_id: viewer.page.id,
      author_id: viewer.id,
      game_title: parsed.data.game_title,
      body: parsed.data.body,
      youtube_url: youtube,
      platforms: parsed.data.platforms,
      release_label: parsed.data.release_label || null,
      genre: parsed.data.genre,
      amount_paise: PROMO_PRICE_PAISE,
      payment_status: "unpaid",
    })
    .select("id")
    .single()
  if (error || !data) return { error: friendlyDbError(error?.message ?? "Could not save the trailer.") }
  redirect(`/upcoming/${(data as { id: string }).id}`)
}

export async function removeUnpaidPromo(formData: FormData) {
  const viewer = await requireUser()
  const promoId = textValue(formData, "promo_id")
  if (!isUuid(promoId)) return
  const supabase = await createClient()
  await supabase.from("game_promos").delete().eq("id", promoId).eq("author_id", viewer.id).eq("payment_status", "unpaid")
  revalidatePath("/upcoming")
  redirect("/upcoming")
}

export async function beginPromoPayment(promoId: string): Promise<{
  error?: string
  orderId?: string
  keyId?: string
  amount?: number
}> {
  const viewer = await requireUser()
  if (!isUuid(promoId)) return { error: "Choose a trailer to pay for." }
  const auth = razorpayAuth()
  if (!auth || !promoPaymentsReady()) {
    return { error: "Payment is not set up yet. The trailer stays hidden until Razorpay is added." }
  }

  const supabase = await createClient()
  const { data: promoRow } = await supabase
    .from("game_promos")
    .select("payment_status, expires_at")
    .eq("id", promoId)
    .eq("author_id", viewer.id)
    .maybeSingle()
  const promo = promoRow as { payment_status?: string; expires_at?: string | null } | null
  const expired = promo?.payment_status === "paid" && (!promo.expires_at || new Date(promo.expires_at).getTime() <= Date.now())
  const { data: state, error: stateError } = await supabase.rpc("promo_checkout_state", { p_promo_id: promoId })
  if (stateError) return { error: friendlyDbError(stateError.message) }
  const row = (Array.isArray(state) ? state[0] : state) as { order_id: string | null; payment_status: string } | undefined
  if (!row) return { error: "This trailer is not waiting for payment." }
  if (row.payment_status === "paid" && !expired) return { error: "This trailer is already published." }
  if (row.order_id && !expired) return { orderId: row.order_id, keyId: auth.keyId, amount: PROMO_PRICE_PAISE }

  let order: Record<string, unknown>
  try {
    order = await razorpay("/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: PROMO_PRICE_PAISE,
        currency: "INR",
        receipt: promoId,
        notes: { promo_id: promoId },
      }),
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Payment could not be started." }
  }

  const orderId = typeof order.id === "string" ? order.id : ""
  if (!orderId) return { error: "Payment could not be started." }
  const { error } = await supabase.rpc("attach_promo_order", { p_promo_id: promoId, p_order_id: orderId })
  if (error) return { error: friendlyDbError(error.message) }
  void viewer
  return { orderId, keyId: auth.keyId, amount: PROMO_PRICE_PAISE }
}

export async function confirmPromoPayment(input: {
  promoId: string
  orderId: string
  paymentId: string
  signature: string
}): Promise<ActionState> {
  const viewer = await requireUser()
  if (!isUuid(input.promoId)) return { error: "Choose a trailer to pay for." }
  if (!razorpayAuth()) return { error: "Payment is not set up yet." }

  let payment: Record<string, unknown>
  try {
    payment = await razorpay(`/payments/${encodeURIComponent(input.paymentId)}`)
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Payment could not be confirmed." }
  }

  const notes = payment.notes && typeof payment.notes === "object" ? (payment.notes as Record<string, unknown>) : {}
  const noteId = typeof notes.promo_id === "string" ? notes.promo_id : ""
  if (
    Number(payment.amount) !== PROMO_PRICE_PAISE ||
    payment.currency !== "INR" ||
    payment.order_id !== input.orderId ||
    (payment.status !== "captured" && payment.status !== "authorized") ||
    (noteId && noteId !== input.promoId)
  ) {
    return { error: "Payment could not be confirmed." }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("confirm_promo_payment", {
    p_promo_id: input.promoId,
    p_order_id: input.orderId,
    p_payment_id: input.paymentId,
    p_signature: input.signature,
  })
  if (error) return { error: friendlyDbError(error.message) }
  revalidatePath("/upcoming")
  revalidatePath(`/upcoming/${input.promoId}`)
  void viewer
  return null
}
