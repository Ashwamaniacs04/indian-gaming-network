import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/person"
import { ActionForm, AreaField, SubmitButton } from "@/components/form-kit"
import { getViewer } from "@/lib/auth"
import { requestMeetupSpot, reviewMeetupRequest } from "@/server/actions/platform"
import { getMeetup, getMeetupRequests } from "@/server/platform-data"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const meetup = await getMeetup(id)
  return { title: meetup?.name ?? "Meetup" }
}

export default function MeetupPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Meetup params={params} />
    </Suspense>
  )
}

function when(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

async function Meetup({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [meetup, requests, viewer] = await Promise.all([getMeetup(id), getMeetupRequests(id), getViewer()])
  if (!meetup) notFound()
  const accepted = requests.filter((request) => request.status === "accepted")
  const left = Math.max(meetup.spots - accepted.length, 0)
  const isHost = viewer?.id === meetup.host_id
  const mine = viewer ? requests.find((request) => request.profile_id === viewer.id && request.status !== "cancelled" && request.status !== "declined") : undefined
  const pending = isHost ? requests.filter((request) => request.status === "pending") : []

  return (
    <article className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <h1 className="text-2xl font-semibold">{meetup.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{when(meetup.starts_at)}</p>
        <p className="text-sm">{meetup.place}, {meetup.city}</p>
        <p className="mt-2 text-sm">
          <Link className="font-medium text-primary" href={`/u/${meetup.host_username}`}>{meetup.host_name}</Link>
          <span className="text-muted-foreground"> is hosting</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>{left} {left === 1 ? "spot" : "spots"} left</Badge>
          <Badge variant="outline">{meetup.spots} total</Badge>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{meetup.note}</p>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Coming</h2>
        {accepted.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No one is accepted yet.</p> : (
          <ul className="mt-3 space-y-2">
            {accepted.map((request) => (
              <li key={request.id}>
                <Link href={`/u/${request.username}`} className="flex items-center gap-2">
                  <UserAvatar name={request.display_name} path={request.avatar_path} className="size-8" />
                  <span className="text-sm font-medium">{request.display_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isHost ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Requests</h2>
          {pending.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No one is waiting for a spot.</p> : (
            <ul className="mt-3 space-y-3">
              {pending.map((request) => (
                <li key={request.id} className="rounded-lg border p-3">
                  <Link href={`/u/${request.username}`} className="text-sm font-medium text-primary">{request.display_name}</Link>
                  <p className="mt-1 text-sm">{request.why}</p>
                  <div className="mt-2 flex gap-2">
                    <form action={reviewMeetupRequest}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <input type="hidden" name="meetup_id" value={meetup.id} />
                      <input type="hidden" name="status" value="accepted" />
                      <Button type="submit" size="sm">Accept</Button>
                    </form>
                    <form action={reviewMeetupRequest}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <input type="hidden" name="meetup_id" value={meetup.id} />
                      <input type="hidden" name="status" value="declined" />
                      <Button type="submit" size="sm" variant="outline">Decline</Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {viewer && !isHost && mine ? (
        <section className="rounded-xl border bg-card p-4">
          <p className="text-sm">Your request is {mine.status}.</p>
          {mine.status === "pending" || mine.status === "accepted" ? (
            <form action={reviewMeetupRequest} className="mt-3">
              <input type="hidden" name="request_id" value={mine.id} />
              <input type="hidden" name="meetup_id" value={meetup.id} />
              <input type="hidden" name="status" value="cancelled" />
              <Button type="submit" size="sm" variant="outline">Cancel</Button>
            </form>
          ) : null}
        </section>
      ) : null}

      {viewer && !isHost && !mine && left > 0 ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Ask for a spot</h2>
          <ActionForm action={requestMeetupSpot} className="mt-3 space-y-3">
            <input type="hidden" name="meetup_id" value={meetup.id} />
            <AreaField name="why" rows={3} required placeholder="One line on why you are coming" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="attend" value="1" required />
              I will attend in person.
            </label>
            <SubmitButton pendingLabel="Sending…">Send request</SubmitButton>
          </ActionForm>
        </section>
      ) : null}

      {!viewer ? <p className="text-sm"><Link className="font-medium text-primary" href={`/login?next=/meetups/${meetup.id}`}>Sign in</Link> to ask for a spot.</p> : null}
      {viewer && !isHost && !mine && left === 0 ? <p className="text-sm text-muted-foreground">Every spot is taken.</p> : null}
    </article>
  )
}
