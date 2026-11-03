import Link from "next/link"
import { signInWithGoogle, signUp } from "@/server/actions/auth"
import { ActionForm, Field, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"
import { SetupNotice } from "@/components/person"
import { BrandLockup } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { ROLE_OPTIONS } from "@/lib/constants"
import { isSupabaseConfigured } from "@/lib/supabase/client"

export const metadata = { title: "Join" }

export default function SignupPage() {
  const configured = isSupabaseConfigured()
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-12">
      <BrandLockup href="/" />
      <h1 className="mt-6 text-2xl font-semibold">Create your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pick the role that best describes your work. You can change it later.</p>
      {!configured ? <div className="mt-6"><SetupNotice /></div> : (
        <>
          <ActionForm action={signUp} className="mt-6 space-y-4">
            <Field label="Name"><TextField name="display_name" required autoComplete="name" /></Field>
            <Field label="Email"><TextField name="email" type="email" required autoComplete="email" /></Field>
            <Field label="Password" hint="At least 8 characters."><TextField name="password" type="password" required autoComplete="new-password" /></Field>
            <Field label="Role">
              <NativeSelect name="role" defaultValue="gamer">
                {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </NativeSelect>
            </Field>
            <SubmitButton pendingLabel="Creating…" size="lg">Create account</SubmitButton>
          </ActionForm>
          <form action={signInWithGoogle} className="mt-3">
            <Button type="submit" variant="outline" className="w-full">Continue with Google</Button>
          </form>
        </>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        Already registered? <Link href="/login" className="font-medium text-primary">Sign in</Link>
      </p>
    </main>
  )
}
