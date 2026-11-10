import { Suspense } from "react"
import { createMeetup } from "@/server/actions/platform"
import { ActionForm, AreaField, Field, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"
import { INDIAN_STATES } from "@/lib/constants"
import { requireUser } from "@/lib/auth"

export const metadata = { title: "Post a meetup" }

export default function NewMeetupPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <NewMeetup />
    </Suspense>
  )
}

async function NewMeetup() {
  await requireUser()
  return (
    <section className="rounded-xl border bg-card p-4">
      <h1 className="text-xl font-semibold">Post a meetup</h1>
      <p className="mt-1 text-sm text-muted-foreground">An in-person meetup. People fill a short form, and you accept who is coming. No tickets.</p>
      <ActionForm action={createMeetup} className="mt-4 space-y-4">
        <Field label="Name"><TextField name="name" required /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="City"><TextField name="city" required /></Field>
          <Field label="State">
            <NativeSelect name="state" required defaultValue="">
              <option value="">Select</option>
              {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Place" hint="A venue or address people can find."><TextField name="place" required /></Field>
        <Field label="Date and time"><TextField name="starts_at" type="datetime-local" required /></Field>
        <Field label="Spots" hint="Between 2 and 200. Only accepted people hold a spot."><TextField name="spots" type="number" min={2} max={200} required defaultValue="10" /></Field>
        <Field label="Note"><AreaField name="note" rows={4} required placeholder="What the meetup is, and what people should bring." /></Field>
        <SubmitButton pendingLabel="Posting…">Post meetup</SubmitButton>
      </ActionForm>
    </section>
  )
}
