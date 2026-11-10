import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/person"
import { getViewer } from "@/lib/auth"
import { getMeetups } from "@/server/platform-data"

export const metadata = { title: "Meetups" }

export default function MeetupsPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Meetups />
    </Suspense>
  )
}

function when(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

async function Meetups() {
  const [viewer, meetups] = await Promise.all([getViewer(), getMeetups()])
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Meetups</h1>
          <p className="mt-1 text-sm text-muted-foreground">Local offline meetups. People ask for a spot, and the host accepts them.</p>
        </div>
        {viewer ? <Button size="sm" asChild><Link href="/meetups/new">Post a meetup</Link></Button> : null}
      </div>
      {meetups.length === 0 ? (
        <EmptyState title="No meetups yet" body={viewer ? "Post a meetup with a place, a time, and how many people can come." : "When someone posts a local meetup, it shows up here."} />
      ) : (
        <div className="space-y-3">
          {meetups.map((meetup) => (
            <Link key={meetup.id} href={`/meetups/${meetup.id}`} className="block rounded-xl border bg-card p-4">
              <span className="block text-base font-semibold">{meetup.name}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{when(meetup.starts_at)} · {meetup.place}, {meetup.city}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{meetup.spots} spots · {meetup.host_name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
