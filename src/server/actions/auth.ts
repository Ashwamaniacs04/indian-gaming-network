"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { siteOrigin } from "@/lib/site"
import { safeNextPath, textValue } from "@/lib/format"
import { firstIssue, loginSchema, signupSchema } from "@/lib/validators"
import type { ActionState } from "@/lib/types"

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
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
