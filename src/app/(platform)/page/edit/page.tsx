import Link from "next/link"
import { Suspense } from "react"
import { savePage } from "@/server/actions/profile"
import { ActionForm, AreaField, Field, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"
import { INDIAN_STATES } from "@/lib/constants"
import { requireUser } from "@/lib/auth"
import { getPageByOwner } from "@/server/queries"

export const metadata = { title: "Edit page" }

export default function EditPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Editor />
    </Suspense>
  )
}

async function Editor() {
  const viewer = await requireUser()
  if (viewer.profile.role !== "studio") {
    return (
      <section className="rounded-xl border bg-card p-5">
        <h1 className="text-xl font-semibold">Studio page</h1>
        <p className="mt-2 text-sm text-muted-foreground">Switch your role to Studio in settings before creating a page.</p>
        <Link href="/settings" className="mt-4 inline-block text-sm font-medium text-primary">Open settings</Link>
      </section>
    )
  }

  const page = await getPageByOwner(viewer.id)

  return (
    <section className="rounded-xl border bg-card p-4">
      <h1 className="text-xl font-semibold">{page ? "Edit your page" : "Create your page"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">This is the public studio presence people can follow.</p>
      <ActionForm action={savePage} className="mt-4 space-y-4">
        <Field label="Name"><TextField name="name" required defaultValue={page?.name ?? ""} /></Field>
        <Field label="Address"><TextField name="slug" required defaultValue={page?.slug ?? ""} /></Field>
        <Field label="Headline"><TextField name="headline" defaultValue={page?.headline ?? ""} /></Field>
        <Field label="About"><AreaField name="about" rows={5} defaultValue={page?.about ?? ""} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="State">
            <NativeSelect name="state" defaultValue={page?.state ?? ""}>
              <option value="">Select</option>
              {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </NativeSelect>
          </Field>
          <Field label="City"><TextField name="city" defaultValue={page?.city ?? ""} /></Field>
        </div>
        <Field label="Website"><TextField name="website" defaultValue={page?.website ?? ""} /></Field>
        <Field label="Contact email"><TextField name="contact_email" type="email" defaultValue={page?.contact_email ?? ""} /></Field>
        <Field label="Games" hint="Comma separated"><TextField name="games" defaultValue={page?.games.join(", ") ?? ""} /></Field>
        <Field label="Specialties" hint="Comma separated"><TextField name="specialties" defaultValue={page?.specialties.join(", ") ?? ""} /></Field>
        <Field label="Logo"><input name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-sm" /></Field>
        <Field label="Banner"><input name="banner" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-sm" /></Field>
        <SubmitButton size="lg">{page ? "Save page" : "Create page"}</SubmitButton>
      </ActionForm>
    </section>
  )
}
