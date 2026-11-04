import Link from "next/link"
import { updatePassword } from "@/server/actions/auth"
import { ActionForm, Field, SubmitButton, TextField } from "@/components/form-kit"
import { BrandLockup } from "@/components/brand"
import { ThemeSwitch } from "@/components/theme-switch"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { SetupNotice } from "@/components/person"

export const metadata = { title: "New password" }

export default function UpdatePasswordPage() {
  const configured = isSupabaseConfigured()
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-12">
      <div className="flex items-center justify-between gap-3">
        <BrandLockup href="/" />
        <ThemeSwitch />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters. This replaces the old password.</p>
      {!configured ? <div className="mt-6"><SetupNotice /></div> : (
        <ActionForm action={updatePassword} className="mt-6 space-y-4">
          <Field label="New password"><TextField name="password" type="password" autoComplete="new-password" required minLength={8} /></Field>
          <SubmitButton pendingLabel="Saving…" size="lg" className="w-full">Save password</SubmitButton>
        </ActionForm>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login/forgot" className="font-medium text-primary">Send a new reset link</Link>
      </p>
    </main>
  )
}
