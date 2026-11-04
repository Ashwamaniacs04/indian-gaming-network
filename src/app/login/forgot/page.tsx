import Link from "next/link"
import { requestPasswordReset } from "@/server/actions/auth"
import { ActionForm, Field, SubmitButton, TextField } from "@/components/form-kit"
import { BrandLockup } from "@/components/brand"
import { ThemeSwitch } from "@/components/theme-switch"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { SetupNotice } from "@/components/person"

export const metadata = { title: "Forgot password" }

export default function ForgotPasswordPage() {
  const configured = isSupabaseConfigured()
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-12">
      <div className="flex items-center justify-between gap-3">
        <BrandLockup href="/" />
        <ThemeSwitch />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-muted-foreground">We will email a link to choose a new password.</p>
      {!configured ? <div className="mt-6"><SetupNotice /></div> : (
        <ActionForm action={requestPasswordReset} className="mt-6 space-y-4">
          <Field label="Email"><TextField name="email" type="email" autoComplete="email" required /></Field>
          <SubmitButton pendingLabel="Sending…" size="lg" className="w-full">Send reset link</SubmitButton>
        </ActionForm>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary">Back to sign in</Link>
      </p>
    </main>
  )
}
