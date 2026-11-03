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
      {items.length === 0 ? <EmptyState title="No alerts" body="When someone comments, applies, or follows your page, you will see it here." /> : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className={`rounded-xl border bg-card p-3 text-sm ${item.read_at ? "" : "border-primary/40"}`}>
              <Link href={hrefFor(item.type, item.entity_id)} className="block">
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
  return "followed your page."
}

function hrefFor(type: string, entityId: string) {
  if (type === "comment") return `/post/${entityId}`
  if (type === "interest") return "/opportunities?tab=inbox"
  return "/search?tab=pages"
}
