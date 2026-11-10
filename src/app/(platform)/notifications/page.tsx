import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/person"
import { markNotificationsRead } from "@/server/actions/social"
import { formatWhen } from "@/lib/format"
import { requireUser } from "@/lib/auth"
import { getNotifications } from "@/server/queries"

export const metadata = { title: "Alerts" }

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Alerts />
    </Suspense>
  )
}

async function Alerts() {
  await requireUser()
  const items = await getNotifications()
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Alerts</h1>
        <form action={markNotificationsRead}>
          <Button type="submit" variant="outline" size="sm">Mark all read</Button>
        </form>
      </div>
      {items.length === 0 ? <EmptyState title="No alerts" body="When someone comments, applies, follows your page, or sends a connection request, you will see it here." /> : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className={`rounded-xl border bg-card p-3 text-sm ${item.read_at ? "" : "border-primary/40"}`}>
              <Link href={hrefFor(item)} className="block">
                <span className="font-medium">{item.actor?.display_name ?? "Someone"}</span>{" "}
                <span className="text-muted-foreground">{copyFor(item.type)}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{formatWhen(item.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function copyFor(type: string) {
  if (type === "comment") return "commented on your post."
  if (type === "interest") return "expressed interest in your listing."
  if (type === "connection_request") return "sent you a connection request."
  if (type === "connection_accept") return "accepted your connection."
  return "followed your page."
}

function hrefFor(item: { type: string; entity_id: string; actor: { username: string } | null }) {
  if (item.type === "comment") return `/post/${item.entity_id}`
  if (item.type === "interest") return "/opportunities?tab=inbox"
  if (item.type === "connection_request" || item.type === "connection_accept") {
    return item.actor?.username ? `/u/${item.actor.username}` : "/notifications"
  }
  return "/search?tab=pages"
}
