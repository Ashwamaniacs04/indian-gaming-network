"use server"

import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { friendlyDbError, textValue } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import type { ActionState } from "@/lib/types"

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser()
  const password = textValue(formData, "password")
  const confirm = textValue(formData, "confirm")
  if (password.length < 8) return { error: "Use at least 8 characters." }
  if (password !== confirm) return { error: "The two passwords do not match." }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: friendlyDbError(error.message) }
  return { success: "Password updated." }
}

export async function changeEmail(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser()
  const email = textValue(formData, "email")
  if (!email.includes("@")) return { error: "Enter a valid email." }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ email })
  if (error) return { error: friendlyDbError(error.message) }
  return { success: "Check that inbox to confirm the new email." }
}

export async function deleteOwnAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser()
  if (textValue(formData, "confirm") !== "DELETE") return { error: "Type DELETE to confirm." }
  const supabase = await createClient()
  const { error } = await supabase.rpc("delete_own_account")
  if (error) return { error: friendlyDbError(error.message) }
  await supabase.auth.signOut()
  redirect("/")
}
