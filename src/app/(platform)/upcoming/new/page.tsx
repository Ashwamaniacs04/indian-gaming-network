import Link from "next/link"
import { Suspense } from "react"
import { createGamePromo } from "@/server/actions/promos"
import { ActionForm, AreaField, Field, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"
import { GAME_GENRES, PLATFORMS } from "@/lib/constants"
import { requireUser } from "@/lib/auth"
import { PROMO_PRICE_LABEL } from "@/lib/promo"

export const metadata = { title: "Post a trailer" }

export default function NewPromoPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <NewPromo />
    </Suspense>
  )
}

async function NewPromo() {
  const viewer = await requireUser()
  if (!viewer.page || viewer.profile.role !== "studio") {
    return (
      <section className="rounded-xl border bg-card p-5">
        <h1 className="text-xl font-semibold">Post a trailer</h1>
        <p className="mt-2 text-sm text-muted-foreground">Upcoming game trailers are posted by a studio page.</p>
        <Link href="/page/edit" className="mt-3 inline-block text-sm font-medium text-primary">Set up your page</Link>
      </section>
    )
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <h1 className="text-xl font-semibold">Post a trailer</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Posted on {viewer.page.name}. The trailer stays hidden until you pay {PROMO_PRICE_LABEL}.
      </p>
      <ActionForm action={createGamePromo} className="mt-4 space-y-4">
        <Field label="Game"><TextField name="game_title" required /></Field>
        <Field label="Genre">
          <NativeSelect name="genre" required defaultValue="">
            <option value="">Choose a genre</option>
            {GAME_GENRES.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
          </NativeSelect>
        </Field>
        <Field label="YouTube trailer"><TextField name="youtube_url" required placeholder="https://www.youtube.com/watch?v=" /></Field>
        <Field label="Promo"><AreaField name="body" rows={5} required placeholder="What the game is, and why people should watch." /></Field>
        <Field label="Release" hint="Optional. For example, 2026 or Coming soon."><TextField name="release_label" /></Field>
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
        <SubmitButton size="lg" pendingLabel="Saving…">Continue to payment</SubmitButton>
      </ActionForm>
    </section>
  )
}
