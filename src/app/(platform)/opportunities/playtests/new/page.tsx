import Link from "next/link"
import { Suspense } from "react"
import { createPlaytest } from "@/server/actions/social"
import { ActionForm, AreaField, Field, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"
import { INDIAN_STATES, PLATFORMS } from "@/lib/constants"
import { requireUser } from "@/lib/auth"

export const metadata = { title: "New playtest" }

export default function NewPlaytestPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <NewPlaytest />
    </Suspense>
  )
}

async function NewPlaytest() {
  const viewer = await requireUser()
  if (!viewer.page || viewer.profile.role !== "studio") {
    return (
      <section className="rounded-xl border bg-card p-5">
        <h1 className="text-xl font-semibold">Post a playtest</h1>
        <p className="mt-2 text-sm text-muted-foreground">Playtests are posted by a studio page.</p>
        <Link href="/page/edit" className="mt-3 inline-block text-sm font-medium text-primary">Set up your page</Link>
      </section>
    )
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <h1 className="text-xl font-semibold">New playtest</h1>
      <p className="mt-1 text-sm text-muted-foreground">Posted on {viewer.page.name}. This is not a feed post.</p>
      <ActionForm action={createPlaytest} className="mt-4 space-y-4">
        <Field label="Title"><TextField name="title" required /></Field>
        <Field label="Game"><TextField name="game_title" required /></Field>
        <Field label="Description"><AreaField name="description" rows={5} required /></Field>
        <fieldset>
          <legend className="text-sm font-medium">Platforms</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PLATFORMS.map((platform) => (
              <label key={platform} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                <input type="checkbox" name="platforms" value={platform} />
                {platform}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Where">
          <NativeSelect name="location_type" defaultValue="remote">
            <option value="remote">Remote</option>
            <option value="onsite">On-site</option>
            <option value="hybrid">Hybrid</option>
          </NativeSelect>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="State">
            <NativeSelect name="state" defaultValue="">
              <option value="">Any</option>
              {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </NativeSelect>
          </Field>
          <Field label="City"><TextField name="city" /></Field>
        </div>
        <Field label="Compensation" hint="Paid, unpaid, credit, or a short note. No checkout in this version.">
          <TextField name="compensation" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Slots"><TextField name="slots" type="number" min={1} /></Field>
          <Field label="Deadline"><TextField name="deadline" type="date" /></Field>
        </div>
        <SubmitButton size="lg" pendingLabel="Publishing…">Publish playtest</SubmitButton>
      </ActionForm>
    </section>
  )
}
