"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { siteOrigin } from "@/lib/site"
import { safeNextPath, textValue } from "@/lib/format"
import { firstIssue, loginSchema, newPasswordSchema, passwordResetRequestSchema, roleSchema, signupSchema } from "@/lib/validators"
import type { ActionState } from "@/lib/types"

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (formData.get("intent") === "link") return sendEmailLink(formData)

  const parsed = signupSchema.safeParse({
    display_name: textValue(formData, "display_name"),
    email: textValue(formData, "email"),
    password: textValue(formData, "password"),
    role: textValue(formData, "role"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const origin = await siteOrigin()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.display_name,
        role: parsed.data.role,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) return { error: error.message }
  if (!data.session) {
    return { success: "Check your email to confirm the account, then sign in." }
  }
  redirect("/onboarding")
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (formData.get("intent") === "link") return sendEmailLink(formData)

  const parsed = loginSchema.safeParse({
    email: textValue(formData, "email"),
    password: textValue(formData, "password"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: error.message }
  redirect(safeNextPath(formData.get("next")))
}

export async function sendEmailLink(formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.pick({ email: true }).safeParse({
    email: textValue(formData, "email"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const displayName = textValue(formData, "display_name")
  const roleResult = roleSchema.safeParse(textValue(formData, "role"))
  const supabase = await createClient()
  const origin = await siteOrigin()
  const next = safeNextPath(formData.get("next"))
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        ...(displayName ? { display_name: displayName } : {}),
        ...(roleResult.success ? { role: roleResult.data } : {}),
      },
    },
  })
  if (error) return { error: error.message }
  return { success: "Check your email for a sign-in link." }
}

export async function requestPasswordReset(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = passwordResetRequestSchema.safeParse({
    email: textValue(formData, "email"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const origin = await siteOrigin()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/login/update-password")}`,
  })
  if (error) return { error: error.message }
  return { success: "If an account exists for that email, a reset link is on its way." }
}

export async function updatePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse({
    password: textValue(formData, "password"),
  })
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return { error: "Open the reset link from your email, then choose a new password." }
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: error.message }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", userData.user.id)
    .maybeSingle()
  const complete = Boolean((profile as { onboarding_complete?: boolean } | null)?.onboarding_complete)
  redirect(complete ? "/feed" : "/onboarding")
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient()
  const origin = await siteOrigin()
  const next = safeNextPath(formData.get("next"))
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })
  if (error || !data.url) {
    redirect("/login?error=google")
  }
  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}
