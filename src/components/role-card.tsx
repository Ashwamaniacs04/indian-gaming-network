import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { UserAvatar } from "@/components/person"
import { roleLabel } from "@/lib/constants"
import { locationLabel } from "@/lib/format"
import type { Profile } from "@/lib/types"

type StudioLink = { name: string; slug: string }
type FactGroup = { label: string; items: string[] }

export function RolePlayerCard({
  profile,
  page,
  href,
}: {
  profile: Profile
  page?: StudioLink | null
  href?: string
}) {
  const place = locationLabel(profile.city, profile.state)
  const facts = roleFacts(profile)

  const body = (
    <>
      {href ? (
        <div className="flex items-center gap-3">
          <UserAvatar name={profile.display_name} path={profile.avatar_path} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{profile.display_name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {roleLabel(profile.role)}{place ? ` · ${place}` : ""}
            </span>
          </span>
        </div>
      ) : (
        <h2 className="text-sm font-semibold">{facts.title}</h2>
      )}
      {href && profile.headline ? <p className="mt-2 line-clamp-2 text-sm">{profile.headline}</p> : null}
      {facts.groups.length > 0 ? (
        <div className={`${href ? "mt-3" : "mt-2"} space-y-2`}>
          {href ? <p className="text-xs font-medium text-muted-foreground">{facts.title}</p> : null}
          {facts.groups.map((group) => (
            <div key={group.label}>
              <p className="text-xs text-muted-foreground">{group.label}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {group.items.map((item, index) => (
                  <Badge key={`${group.label}-${index}-${item}`} variant="secondary">{item}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : href || profile.role === "studio" ? null : (
        <p className="mt-2 text-sm text-muted-foreground">No {facts.title.toLowerCase()} details yet.</p>
      )}
      {profile.role === "studio" && page ? (
        href ? (
          <p className="mt-2 text-xs text-primary">{page.name}</p>
        ) : (
          <Link href={`/p/${page.slug}`} className="mt-2 block text-sm font-medium text-primary">{page.name}</Link>
        )
      ) : null}
      {profile.role === "studio" && !page && !href ? (
        <p className="mt-2 text-sm text-muted-foreground">This studio has not published a page yet.</p>
      ) : null}
    </>
  )

  if (href) {
    return <Link href={href} className="block rounded-xl border bg-card p-3">{body}</Link>
  }
  return <section className="rounded-xl border bg-card p-4">{body}</section>
}

function roleFacts(profile: Profile): { title: string; groups: FactGroup[] } {
  const details = profile.role_details
  const names = (values?: string[]) => (values ?? []).map((value) => value.trim()).filter(Boolean)
  const groups = (rows: Array<[string, string[]]>) =>
    rows.flatMap(([label, items]) => (items.length > 0 ? [{ label, items }] : []))

  if (profile.role === "gamer") {
    return {
      title: "Play",
      groups: groups([
        ["Platforms", names(details.platforms)],
        ["Favorite games", names(details.favorite_games)],
      ]),
    }
  }
  if (profile.role === "tester") {
    return {
      title: "Testing",
      groups: groups([
        ["Experience", details.years_experience ? [`${details.years_experience} years`] : []],
        ["Platforms", names(details.platforms)],
        ["Games tested", names(details.games_tested)],
      ]),
    }
  }
  if (profile.role === "streamer") {
    return {
      title: "Channel",
      groups: groups([
        ["Schedule", details.schedule?.trim() ? [details.schedule.trim()] : []],
        ["Typical viewers", details.avg_viewers ? [`${details.avg_viewers}`] : []],
        ["Platforms", names(details.platforms)],
      ]),
    }
  }
  if (profile.role === "cosplay_artist") {
    return {
      title: "Cosplay",
      groups: groups([
        ["Characters", names(details.characters)],
        ["Conventions", names(details.conventions)],
      ]),
    }
  }
  return { title: "Studio", groups: [] }
}
