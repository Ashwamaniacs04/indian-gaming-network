import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { changeEmail, changePassword, deleteOwnAccount } from "@/server/actions/account"
import { signOut } from "@/server/actions/auth"
import { updateRole } from "@/server/actions/profile"
import { ActionForm, Field, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"
import { ThemeSwitch } from "@/components/theme-switch"
import { ROLE_OPTIONS, roleLabel } from "@/lib/constants"
import { requireUser } from "@/lib/auth"

export const metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Settings />
    </Suspense>
  )
}

async function Settings() {
  const viewer = await requireUser()
  const profile = viewer.profile

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Settings</h1>
        <Button variant="outline" size="sm" asChild><Link href="/profile/edit">Edit profile</Link></Button>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">The site opens in light. Your choice stays on this browser.</p>
        <div className="mt-3"><ThemeSwitch /></div>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Sign-in email</h2>
        <ActionForm action={changeEmail} className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Email"><TextField name="email" type="email" required /></Field>
          <SubmitButton variant="outline">Update email</SubmitButton>
        </ActionForm>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Password</h2>
        <ActionForm action={changePassword} className="mt-3 space-y-3">
          <Field label="New password"><TextField name="password" type="password" required minLength={8} /></Field>
          <Field label="Confirm"><TextField name="confirm" type="password" required minLength={8} /></Field>
          <SubmitButton variant="outline">Change password</SubmitButton>
        </ActionForm>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Role</h2>
        <p className="mt-1 text-sm text-muted-foreground">Current role: {roleLabel(profile.role)}</p>
        <form action={updateRole} className="mt-3 flex flex-wrap items-end gap-2">
          <NativeSelect name="role" defaultValue={profile.role} className="max-w-xs">
            {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </NativeSelect>
          <Button type="submit" variant="outline">Update role</Button>
        </form>
        {profile.role === "studio" ? (
          <Link href="/page/edit" className="mt-3 inline-block text-sm font-medium text-primary">
            {viewer.page ? "Edit your studio page" : "Create your studio page"}
          </Link>
        ) : null}
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Sign out</h2>
        <form action={signOut} className="mt-3">
          <Button type="submit" variant="outline">Sign out</Button>
        </form>
      </section>

      <section className="rounded-xl border border-destructive/40 bg-card p-4">
        <h2 className="text-sm font-semibold">Delete account</h2>
        <p className="mt-1 text-sm text-muted-foreground">This removes your login. Type DELETE to confirm.</p>
        <ActionForm action={deleteOwnAccount} className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Confirmation"><TextField name="confirm" required /></Field>
          <SubmitButton variant="outline">Delete account</SubmitButton>
        </ActionForm>
      </section>
    </div>
  )
}
