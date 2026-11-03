import Link from "next/link"
import { Suspense } from "react"
import { signIn, signInWithGoogle } from "@/server/actions/auth"
import { ActionForm, Field, SubmitButton, TextField } from "@/components/form-kit"
import { SetupNotice } from "@/components/person"
import { BrandLockup } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { isSupabaseConfigured } from "@/lib/supabase/client"

export const metadata = { title: "Sign in" }

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Loading…</div>}>
      <LoginForm searchParams={searchParams} />
    </Suspense>
  )
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams
  const next = params.next ?? "/feed"
  const configured = isSupabaseConfigured()

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-12">
      <BrandLockup href="/" />
      <h1 className="mt-6 text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use the email on your industry profile.</p>
      {!configured ? <div className="mt-6"><SetupNotice /></div> : (
        <>
          {params.error === "google" ? <p className="mt-4 text-sm text-destructive">Google sign-in is not available until the provider is enabled in Supabase.</p> : null}
          <ActionForm action={signIn} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={next} />
            <Field label="Email"><TextField name="email" type="email" autoComplete="email" required /></Field>
            <Field label="Password"><TextField name="password" type="password" autoComplete="current-password" required /></Field>
            <SubmitButton pendingLabel="Signing in…" size="lg">Sign in</SubmitButton>
          </ActionForm>
          <form action={signInWithGoogle} className="mt-3">
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="outline" className="w-full">Continue with Google</Button>
          </form>
        </>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        New here? <Link href="/signup" className="font-medium text-primary">Create an account</Link>
      </p>
    </main>
  )
}
