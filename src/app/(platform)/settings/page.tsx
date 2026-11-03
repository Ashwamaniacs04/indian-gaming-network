import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { addExperience, addPortfolio, deleteExperience, deletePortfolio, updateProfile, updateRole } from "@/server/actions/profile"
import { ActionForm, AreaField, Field, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"
import { AVAILABILITY_OPTIONS, INDIAN_STATES, PLATFORMS, ROLE_OPTIONS, roleLabel } from "@/lib/constants"
import { formatMonth } from "@/lib/format"
import { requireUser } from "@/lib/auth"
import { getExperience, getPortfolio } from "@/server/queries"

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
  const [portfolio, experience] = await Promise.all([getPortfolio(viewer.id), getExperience(viewer.id)])
  const details = profile.role_details

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

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
        <h2 className="text-sm font-semibold">Profile</h2>
        <ActionForm action={updateProfile} className="mt-4 space-y-4">
          <Field label="Name"><TextField name="display_name" required defaultValue={profile.display_name} /></Field>
          <Field label="Headline"><TextField name="headline" defaultValue={profile.headline ?? ""} /></Field>
          <Field label="About"><AreaField name="about" rows={5} defaultValue={profile.about ?? ""} /></Field>
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
