"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { friendlyDbError, textValue } from "@/lib/format"
import { siteOrigin } from "@/lib/site"
import { createClient } from "@/lib/supabase/server"
import {
  createCodeVerifier,
  digilockerReady,
  gstinIsValid,
  gstReady,
  isIdDocumentType,
  normalizeGstin,
  pageVerificationPayload,
  verificationSignature,
} from "@/lib/verification"
import { digilockerAuthorizeUrl } from "@/server/digilocker"
import { lookupGstin } from "@/server/gst"
import type { ActionState } from "@/lib/types"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function startDigilocker(formData: FormData) {
  const viewer = await requireUser()
  if (viewer.profile.verified) redirect("/profile/edit?verification=done")
  if (!digilockerReady()) redirect("/profile/edit?verification=not_setup")

  const documentType = textValue(formData, "document_type")
  if (!isIdDocumentType(documentType)) redirect("/profile/edit?verification=failed")

  const verifier = createCodeVerifier()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("begin_verification", {
    p_kind: "profile",
    p_document_type: documentType,
    p_verifier: verifier,
  })
  if (error || typeof data !== "string" || !data) redirect("/profile/edit?verification=sql")

  const origin = await siteOrigin()
  redirect(digilockerAuthorizeUrl({
    nonce: data,
    verifier,
    documentType,
    redirectUri: `${origin}/auth/digilocker`,
  }))
}

export async function verifyGst(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireUser()
  if (viewer.profile.role !== "studio" || !viewer.page) return { error: "Create your studio page first." }
  if (!gstReady()) return { error: "Verification is not set up yet." }

  const gstin = normalizeGstin(textValue(formData, "gstin"))
  if (!gstinIsValid(gstin)) return { error: "That GST number does not look valid." }

  const supabase = await createClient()
  const { data: pageRow } = await supabase.from("pages").select("id, verified").eq("owner_id", viewer.id).maybeSingle()
  const page = pageRow as { id: string; verified?: boolean } | null
  if (!page) return { error: "Create your studio page first." }
  if (page.verified) return { success: "This page already has the verified tick." }

  const lookup = await lookupGstin(gstin)
  if ("error" in lookup) return { error: lookup.error }

  const { data: nonce, error: nonceError } = await supabase.rpc("begin_verification", {
    p_kind: "page",
    p_document_type: null,
    p_verifier: null,
  })
  if (nonceError || typeof nonce !== "string" || !nonce) {
    return { error: friendlyDbError(nonceError?.message ?? "Verification is not ready yet. Run the new SQL in Supabase.") }
  }

  const signature = verificationSignature(pageVerificationPayload(viewer.id, page.id, gstin, lookup.legalName, nonce))
  const { error } = await supabase.rpc("confirm_page_verification", {
    p_gstin: gstin,
    p_legal_name: lookup.legalName,
    p_nonce: nonce,
    p_signature: signature,
  })
  if (error) return { error: friendlyDbError(error.message) }

  revalidatePath("/page/edit")
  revalidatePath(`/p/${viewer.page.slug}`)
  return { success: "GST confirmed. This page now has the grey tick." }
}

export async function adminRevokeVerification(formData: FormData) {
  const viewer = await requireUser()
  if (!viewer.isAdmin) return
  const kind = textValue(formData, "kind")
  const target = textValue(formData, "target_id")
  if ((kind !== "profile" && kind !== "page") || !isUuid(target)) return
  const supabase = await createClient()
  await supabase.rpc("admin_revoke_verification", { p_kind: kind, p_target: target })
  revalidatePath("/admin")
  revalidatePath("/", "layout")
}
