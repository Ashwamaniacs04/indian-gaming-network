import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { addExperience, addPortfolio, deleteExperience, deletePortfolio, updateProfile } from "@/server/actions/profile"
import { startDigilocker } from "@/server/actions/verification"
import { ActionForm, AreaField, Field, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"
import { AVAILABILITY_OPTIONS, INDIAN_STATES, LANGUAGES, PLATFORMS } from "@/lib/constants"
import { formatMonth } from "@/lib/format"
import { requireUser } from "@/lib/auth"
import { ID_DOCUMENT_LABELS, ID_DOCUMENT_TYPES, digilockerReady } from "@/lib/verification"
import { getExperience, getPortfolio } from "@/server/queries"

export const metadata = { title: "Edit profile" }

const VERIFICATION_NOTES: Record<string, string> = {
  done: "Your profile has the grey tick.",
  not_setup: "Verification is not set up yet.",
  cancelled: "DigiLocker was cancelled. You can try again.",
  failed: "Verification could not be confirmed.",
  sql: "Verification is not ready yet. Run the new SQL in Supabase.",
  signin: "Sign in again, then try DigiLocker.",
  no_document: "DigiLocker did not return a usable ID.",
}

export default function EditProfilePage({ searchParams }: { searchParams: Promise<{ verification?: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Editor searchParams={searchParams} />
    </Suspense>
  )
}

async function Editor({ searchParams }: { searchParams: Promise<{ verification?: string }> }) {
  const viewer = await requireUser()
  const params = await searchParams
  const profile = viewer.profile
  const verificationNote = profile.verified
    ? "Your profile has the grey tick."
    : VERIFICATION_NOTES[params.verification ?? ""] ?? (digilockerReady() ? null : "Verification is not set up yet.")
  const [portfolio, experience] = await Promise.all([getPortfolio(viewer.id), getExperience(viewer.id)])
  const details = profile.role_details

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Edit profile</h1>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Verified tick</h2>
        <p className="mt-1 text-sm text-muted-foreground">Optional. Confirm one government ID in DigiLocker. The ID number stays private, and the tick is grey.</p>
        {verificationNote ? <p className="mt-3 text-sm">{verificationNote}</p> : null}
        {profile.verified ? null : (
          <form action={startDigilocker} className="mt-4 space-y-4">
            <Field label="Government ID">
              <NativeSelect name="document_type" defaultValue="aadhaar">
                {ID_DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{ID_DOCUMENT_LABELS[type]}</option>)}
              </NativeSelect>
            </Field>
            <SubmitButton>Verify with DigiLocker</SubmitButton>
          </form>
        )}
      </section>
      <section className="rounded-xl border bg-card p-4">
        <ActionForm action={updateProfile} className="space-y-4">
          <Field label="Name"><TextField name="display_name" required defaultValue={profile.display_name} /></Field>
          <Field label="Headline"><TextField name="headline" defaultValue={profile.headline ?? ""} /></Field>
          <Field label="About"><AreaField name="about" rows={5} defaultValue={profile.about ?? ""} /></Field>
          <Field label="Looking for" hint="One short line, such as paid playtests, a team, sponsors, or bookings.">
            <TextField name="looking_for" defaultValue={profile.looking_for ?? ""} />
          </Field>
          <fieldset>
            <legend className="text-sm font-medium">Languages</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map((language) => (
                <label key={language} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                  <input type="checkbox" name="languages" value={language} defaultChecked={profile.languages.includes(language)} />
                  {language}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="State">
              <NativeSelect name="state" defaultValue={profile.state ?? ""}>
                <option value="">Select</option>
                {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </NativeSelect>
            </Field>
            <Field label="City"><TextField name="city" defaultValue={profile.city ?? ""} /></Field>
          </div>
          <Field label="Availability">
            <NativeSelect name="availability" defaultValue={profile.availability ?? ""}>
              <option value="">Not set</option>
              {AVAILABILITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Skills" hint="Comma separated"><TextField name="skills" defaultValue={profile.skills.join(", ")} /></Field>
          <Field label="Website"><TextField name="website" defaultValue={profile.website ?? ""} /></Field>
          <Field label="Contact email"><TextField name="contact_email" type="email" defaultValue={profile.contact_email ?? ""} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="YouTube"><TextField name="youtube" defaultValue={profile.socials.youtube ?? ""} /></Field>
            <Field label="Twitch"><TextField name="twitch" defaultValue={profile.socials.twitch ?? ""} /></Field>
            <Field label="Instagram"><TextField name="instagram" defaultValue={profile.socials.instagram ?? ""} /></Field>
            <Field label="Discord"><TextField name="discord" defaultValue={profile.socials.discord ?? ""} /></Field>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Platforms</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => (
                <label key={platform} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                  <input type="checkbox" name="platforms" value={platform} defaultChecked={details.platforms?.includes(platform)} />
                  {platform}
                </label>
              ))}
            </div>
          </fieldset>
          {profile.role === "gamer" ? <Field label="Favorite games" hint="Comma separated"><TextField name="favorite_games" defaultValue={details.favorite_games?.join(", ") ?? ""} /></Field> : null}
          {profile.role === "tester" ? (
            <>
              <Field label="Years of experience"><TextField name="years_experience" type="number" min={0} defaultValue={details.years_experience ?? ""} /></Field>
              <Field label="Games tested" hint="Comma separated"><TextField name="games_tested" defaultValue={details.games_tested?.join(", ") ?? ""} /></Field>
            </>
          ) : null}
          {profile.role === "streamer" ? (
            <>
              <Field label="Schedule"><TextField name="schedule" defaultValue={details.schedule ?? ""} /></Field>
              <Field label="Typical viewers"><TextField name="avg_viewers" type="number" min={0} defaultValue={details.avg_viewers ?? ""} /></Field>
            </>
          ) : null}
          {profile.role === "cosplay_artist" ? (
            <>
              <Field label="Characters" hint="Comma separated"><TextField name="characters" defaultValue={details.characters?.join(", ") ?? ""} /></Field>
              <Field label="Conventions" hint="Comma separated"><TextField name="conventions" defaultValue={details.conventions?.join(", ") ?? ""} /></Field>
            </>
          ) : null}
          <Field label="Profile photo"><input name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-sm" /></Field>
          <Field label="Banner"><input name="banner" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-sm" /></Field>
          <SubmitButton size="lg">Save profile</SubmitButton>
        </ActionForm>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Showcase</h2>
        <ul className="mt-3 space-y-2">
          {portfolio.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{item.title}</span>
              <form action={deletePortfolio}>
                <input type="hidden" name="id" value={item.id} />
                <Button type="submit" variant="ghost" size="sm">Remove</Button>
              </form>
            </li>
          ))}
        </ul>
        <ActionForm action={addPortfolio} className="mt-4 space-y-3">
          <Field label="Title"><TextField name="title" required /></Field>
          <Field label="Caption"><TextField name="caption" /></Field>
          <Field label="Link"><TextField name="external_url" /></Field>
          <Field label="Image"><input name="media" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-sm" /></Field>
          <SubmitButton variant="outline">Add showcase item</SubmitButton>
        </ActionForm>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Experience</h2>
        <ul className="mt-3 space-y-2">
          {experience.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{item.title}{item.start_date ? ` · ${formatMonth(item.start_date)}` : ""}</span>
              <form action={deleteExperience}>
                <input type="hidden" name="id" value={item.id} />
                <Button type="submit" variant="ghost" size="sm">Remove</Button>
              </form>
            </li>
          ))}
        </ul>
        <ActionForm action={addExperience} className="mt-4 space-y-3">
          <Field label="Title"><TextField name="title" required /></Field>
          <Field label="Organization"><TextField name="organization" /></Field>
          <Field label="Game"><TextField name="game_title" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Start"><TextField name="start_date" type="month" /></Field>
            <Field label="End"><TextField name="end_date" type="month" /></Field>
          </div>
          <Field label="Description"><AreaField name="description" rows={3} /></Field>
          <SubmitButton variant="outline">Add experience</SubmitButton>
        </ActionForm>
      </section>
    </div>
  )
}
