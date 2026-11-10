import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ActionForm, AreaField, Field, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"
import { INDIAN_STATES } from "@/lib/constants"
import { requireUser } from "@/lib/auth"
import { adminUpdatePage, adminUpdateProfile } from "@/server/actions/platform"
import { getPageForAdmin, getProfileById } from "@/server/platform-data"

export const metadata = { title: "Edit account" }

export default function AdminEditPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Editor params={params} />
    </Suspense>
  )
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireUser()
  if (!viewer.isAdmin) notFound()
  const { id } = await params
  const profile = await getProfileById(id)
  if (!profile) notFound()
  const page = profile.role === "studio" ? await getPageForAdmin(profile.id) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Edit {profile.display_name}</h1>
        <Link href="/admin" className="text-sm font-medium text-primary">Back</Link>
      </div>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Profile</h2>
        <ActionForm action={adminUpdateProfile} className="mt-3 space-y-3">
          <input type="hidden" name="target_id" value={profile.id} />
          <input type="hidden" name="username" value={profile.username} />
          <Field label="Name"><TextField name="display_name" required defaultValue={profile.display_name} /></Field>
          <Field label="Headline"><TextField name="headline" defaultValue={profile.headline ?? ""} /></Field>
          <Field label="About"><AreaField name="about" rows={4} defaultValue={profile.about ?? ""} /></Field>
          <Field label="Looking for"><TextField name="looking_for" defaultValue={profile.looking_for ?? ""} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City"><TextField name="city" defaultValue={profile.city ?? ""} /></Field>
            <Field label="State">
              <NativeSelect name="state" defaultValue={profile.state ?? ""}>
                <option value="">Select</option>
                {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
        </ActionForm>
      </section>
      {page ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Studio page</h2>
          <ActionForm action={adminUpdatePage} className="mt-3 space-y-3">
            <input type="hidden" name="page_id" value={page.id} />
            <input type="hidden" name="slug" value={page.slug} />
            <Field label="Name"><TextField name="name" required defaultValue={page.name} /></Field>
            <Field label="Headline"><TextField name="headline" defaultValue={page.headline ?? ""} /></Field>
            <Field label="About"><AreaField name="about" rows={4} defaultValue={page.about ?? ""} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="City"><TextField name="city" defaultValue={page.city ?? ""} /></Field>
              <Field label="State">
                <NativeSelect name="state" defaultValue={page.state ?? ""}>
                  <option value="">Select</option>
                  {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                </NativeSelect>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="featured" value="1" defaultChecked={Boolean(page.featured)} />
              Feature this page in the side column
            </label>
            <SubmitButton pendingLabel="Saving…">Save page</SubmitButton>
          </ActionForm>
        </section>
      ) : null}
    </div>
  )
}
