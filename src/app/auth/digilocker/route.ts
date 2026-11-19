import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { siteOrigin } from "@/lib/site"
import {
  digilockerReady,
  isIdDocumentType,
  profileVerificationPayload,
  verificationSignature,
} from "@/lib/verification"
import { exchangeDigilockerCode } from "@/server/digilocker"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const back = (code: string) => NextResponse.redirect(new URL(`/profile/edit?verification=${code}`, url.origin))
  if (url.searchParams.get("error")) return back("cancelled")
  if (!digilockerReady()) return back("not_setup")

  const code = url.searchParams.get("code") ?? ""
  const nonce = url.searchParams.get("state") ?? ""
  if (!code || !nonce) return back("failed")

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return back("signin")

  const { data: challenge, error: challengeError } = await supabase.rpc("verification_challenge", { p_nonce: nonce })
  const row = Array.isArray(challenge) ? challenge[0] : challenge
  const verifier = row && typeof row === "object" && "code_verifier" in row ? String(row.code_verifier ?? "") : ""
  const documentType = row && typeof row === "object" && "document_type" in row ? String(row.document_type ?? "") : ""
  if (challengeError || !verifier || !isIdDocumentType(documentType)) return back("failed")

  const origin = await siteOrigin()
  const proof = await exchangeDigilockerCode({
    code,
    verifier,
    documentType,
    redirectUri: `${origin}/auth/digilocker`,
  }).catch(() => null)
  if (!proof) return back("no_document")

  const signature = verificationSignature(
    profileVerificationPayload(userData.user.id, documentType, proof.last4, proof.governmentName, nonce),
  )
  const { error } = await supabase.rpc("confirm_profile_verification", {
    p_document_type: documentType,
    p_last4: proof.last4,
    p_government_name: proof.governmentName,
    p_nonce: nonce,
    p_signature: signature,
  })
  if (error) return back("failed")
  return back("done")
}
