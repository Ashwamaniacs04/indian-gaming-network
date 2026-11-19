import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ActionForm, SubmitButton } from "@/components/form-kit"
import { EmptyState, PersonLink, UserAvatar } from "@/components/person"
import { PostCard, ReportBox } from "@/components/post-card"
import { RolePlayerCard } from "@/components/role-card"
import { VerifiedName } from "@/components/verified-mark"
import { roleLabel } from "@/lib/constants"
import { formatMonth, locationLabel, publicStorageUrl } from "@/lib/format"
import { acceptConnection, removeConnection, requestConnection } from "@/server/actions/social"
import type { ExperienceItem, PortfolioItem, PostCard as PostCardData, Profile, ProfileConnection, Role, StudioPage, Viewer } from "@/lib/types"

export function ProfileView({
  profile,
  page,
  portfolio,
  experience,
  posts,
  viewer,
  connection,
}: {
  profile: Profile
  page: StudioPage | null
  portfolio: PortfolioItem[]
  experience: ExperienceItem[]
  posts: PostCardData[]
  viewer: Viewer | null
  connection: ProfileConnection
}) {
  const banner = publicStorageUrl("banners", profile.banner_path)
  const isOwner = viewer?.id === profile.id

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="profile-banner h-36 bg-gradient-to-r from-blue-800 to-sky-500 sm:h-44">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="px-4 pb-5">
          <UserAvatar name={profile.display_name} path={profile.avatar_path} className="-mt-10 size-20 bg-card ring-4 ring-background" />
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold"><VerifiedName name={profile.display_name} verified={profile.verified} /></h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
            {isOwner ? (
              <Button variant="outline" size="sm" asChild><Link href="/profile/edit">Edit profile</Link></Button>
            ) : viewer ? (
              <ConnectionControls profileId={profile.id} username={profile.username} connection={connection} />
            ) : null}
          </div>
          {profile.headline ? <p className="mt-2 text-sm">{profile.headline}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge>{roleLabel(profile.role)}</Badge>
            {locationLabel(profile.city, profile.state) ? <Badge variant="outline">{locationLabel(profile.city, profile.state)}</Badge> : null}
            {profile.availability ? <Badge variant="secondary">{profile.availability}</Badge> : null}
            {profile.languages.map((language) => <Badge key={language} variant="outline">{language}</Badge>)}
          </div>
          {viewer && !isOwner ? <MutualConnections people={connection.mutuals} /> : null}
        </div>
      </section>

      {profile.about ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">About</h2>
          <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{profile.about}</p>
        </section>
      ) : null}

      {profile.skills.length > 0 ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Skills</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.skills.map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}
          </div>
        </section>
      ) : null}

      <RolePlayerCard profile={profile} page={page ? { name: page.name, slug: page.slug, verified: page.verified } : null} />

      {(profile.role === "cosplay_artist" || profile.role === "streamer" || portfolio.length > 0) ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Showcase</h2>
          {portfolio.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{isOwner ? "Add a showcase image from Edit profile so people can see your work." : "No showcase images yet."}</p> : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {portfolio.map((item) => {
                const media = publicStorageUrl("portfolio", item.media_path)
                return (
                  <article key={item.id} className="overflow-hidden rounded-lg border">
                    <div className="aspect-[4/3] bg-muted">
                      {media ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={media} alt="" className="size-full object-cover" />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium">{item.title}</h3>
                      {item.caption ? <p className="mt-1 text-xs text-muted-foreground">{item.caption}</p> : null}
                      {item.external_url ? <a href={item.external_url} className="mt-2 inline-block text-xs text-primary" target="_blank" rel="noreferrer">Open link</a> : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      ) : null}

      {(profile.role === "tester" || profile.role === "studio" || experience.length > 0) ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Experience</h2>
          {experience.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No past work listed yet.</p> : (
            <ul className="mt-3 space-y-3">
              {experience.map((item) => (
                <li key={item.id} className="border-b pb-3 last:border-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {[item.organization, item.game_title, formatMonth(item.start_date), item.end_date ? formatMonth(item.end_date) : "Present"].filter(Boolean).join(" · ")}
                  </p>
                  {item.description ? <p className="mt-1 text-sm">{item.description}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <ContactCard profile={profile} page={page} isOwner={isOwner} />

      {viewer && !isOwner ? (
        <details className="rounded-xl border bg-card p-4 text-sm">
          <summary className="cursor-pointer text-muted-foreground">Report this profile</summary>
          <ReportBox targetType="profile" targetId={profile.id} />
        </details>
      ) : null}

      <div className="space-y-3">
        {posts.length === 0 ? <EmptyState title="No posts yet" body={isOwner ? "Publish an image, video, job, or collab from the feed so it shows up here." : "This profile has not published a post yet."} /> : pinFirst(posts, profile.pinned_post_id).map((post) => (
          <PostCard key={post.id} post={post} viewer={viewer} pinned={post.id === profile.pinned_post_id} pinScope={isOwner ? "profile" : null} />
        ))}
      </div>
    </div>
  )
}

type ContactRow = { label: string; value: string; href: string | null }

function contactTitle(role: Role) {
  if (role === "streamer") return "Channel contact"
  if (role === "cosplay_artist") return "Booking contact"
  if (role === "studio") return "Studio contact"
  return "Contact"
}

function contactEmpty(role: Role, isOwner: boolean) {
  if (!isOwner) {
    if (role === "streamer") return "No channel links yet."
    if (role === "cosplay_artist") return "No booking contact yet."
    if (role === "studio") return "No studio contact yet."
    return "No public contact details yet."
  }
  if (role === "gamer") return "Add Discord, a website, or an email from Edit profile."
  if (role === "tester") return "Add an email or Discord from Edit profile so studios can reach you."
  if (role === "streamer") return "Add Twitch, YouTube, Instagram, or Discord from Edit profile."
  if (role === "cosplay_artist") return "Add Instagram, an email, or a website from Edit profile."
  return "Add a website or email on your studio page."
}

function webHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value
  if (/^[\w.-]+\.[a-z]{2,}([/?#]\S*)?$/i.test(value)) return `https://${value}`
  return null
}

function contactHref(kind: "email" | "web", value: string) {
  if (kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? `mailto:${value}` : null
  return webHref(value)
}

function contactRow(label: string, value: string | null | undefined, kind: "email" | "web" | "plain"): ContactRow | null {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return null
  const href = kind === "plain" ? webHref(trimmed) : contactHref(kind, trimmed)
  return { label, value: trimmed, href }
}

function sameText(left: string, right: string | null | undefined) {
  return left.trim().toLowerCase() === (right ?? "").trim().toLowerCase()
}

function orderRows(order: string[], rows: ContactRow[]) {
  return order.flatMap((label) => rows.filter((row) => row.label === label))
}

function contactRows(profile: Profile, page: StudioPage | null) {
  const person = [
    contactRow("Email", profile.contact_email, "email"),
    contactRow("Website", profile.website, "web"),
    contactRow("YouTube", profile.socials.youtube, "web"),
    contactRow("Twitch", profile.socials.twitch, "web"),
    contactRow("Instagram", profile.socials.instagram, "web"),
    contactRow("Discord", profile.socials.discord, "plain"),
  ].filter((row): row is ContactRow => row !== null)

  if (profile.role === "studio") {
    const studio: ContactRow[] = []
    if (page) {
      studio.push({ label: "Studio page", value: page.name, href: `/p/${page.slug}` })
      const pageEmail = contactRow("Studio email", page.contact_email, "email")
      const pageSite = contactRow("Studio website", page.website, "web")
      if (pageEmail) studio.push(pageEmail)
      if (pageSite) studio.push(pageSite)
    }
    const rest = person.filter((row) => {
      if (row.label === "Email" && page && sameText(row.value, page.contact_email)) return false
      if (row.label === "Website" && page && sameText(row.value, page.website)) return false
      return true
    })
    return [...studio, ...orderRows(["Discord", "YouTube", "Twitch", "Instagram", "Email", "Website"], rest)]
  }

  const order =
    profile.role === "tester"
      ? ["Email", "Discord", "Website", "YouTube", "Twitch", "Instagram"]
      : profile.role === "streamer"
        ? ["Twitch", "YouTube", "Instagram", "Discord", "Website", "Email"]
        : profile.role === "cosplay_artist"
          ? ["Instagram", "Email", "Website", "Discord", "YouTube", "Twitch"]
          : ["Discord", "Website", "Email", "YouTube", "Twitch", "Instagram"]
  return orderRows(order, person)
}

function ContactCard({ profile, page, isOwner }: { profile: Profile; page: StudioPage | null; isOwner: boolean }) {
  const rows = contactRows(profile, page)
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">{contactTitle(profile.role)}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{contactEmpty(profile.role, isOwner)}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {rows.map((row) => (
            <li key={row.label}>
              {row.href?.startsWith("/") ? (
                <Link className="text-primary" href={row.href}>{row.label}: {row.value}</Link>
              ) : row.href ? (
                <a className="text-primary" href={row.href} {...(row.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                  {row.label}: {row.value}
                </a>
              ) : (
                <span>{row.label}: {row.value}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function pinFirst(posts: PostCardData[], pinnedId: string | null) {
  if (!pinnedId) return posts
  return [...posts].sort((left, right) => Number(right.id === pinnedId) - Number(left.id === pinnedId))
}

function mutualLabel(count: number) {
  if (count === 0) return "No mutual connections"
  if (count === 1) return "1 mutual connection"
  return `${count} mutual connections`
}

function MutualConnections({ people }: { people: ProfileConnection["mutuals"] }) {
  const label = mutualLabel(people.length)
  if (people.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{label}</p>
  }

  const shown = people.slice(0, 20)
  const extra = people.length - shown.length

  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-medium text-primary">{label}</summary>
      <ul className="mt-2 space-y-2">
        {shown.map((person) => (
          <li key={person.id}>
            <PersonLink
              href={`/u/${person.username}`}
              name={person.display_name}
              path={person.avatar_path}
              meta={person.headline || `@${person.username}`}
            />
          </li>
        ))}
      </ul>
      {extra > 0 ? <p className="mt-2 text-xs text-muted-foreground">and {extra} more</p> : null}
    </details>
  )
}

function ConnectionControls({
  profileId,
  username,
  connection,
}: {
  profileId: string
  username: string
  connection: ProfileConnection
}) {
  if (connection.status === "incoming" && connection.id) {
    return (
      <div className="flex shrink-0 items-start gap-2">
        <ActionForm action={acceptConnection}>
          <input type="hidden" name="connection_id" value={connection.id} />
          <input type="hidden" name="username" value={username} />
          <SubmitButton size="sm" pendingLabel="Accepting…">Accept</SubmitButton>
        </ActionForm>
        <ActionForm action={removeConnection}>
          <input type="hidden" name="connection_id" value={connection.id} />
          <input type="hidden" name="username" value={username} />
          <SubmitButton size="sm" variant="outline" pendingLabel="Declining…">Decline</SubmitButton>
        </ActionForm>
      </div>
    )
  }

  if (connection.status === "requested" && connection.id) {
    return (
      <ActionForm action={removeConnection} className="shrink-0">
        <input type="hidden" name="connection_id" value={connection.id} />
        <input type="hidden" name="username" value={username} />
        <SubmitButton size="sm" variant="outline" pendingLabel="Cancelling…" title="Cancel request">Requested</SubmitButton>
      </ActionForm>
    )
  }

  if (connection.status === "connected" && connection.id) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Badge variant="secondary">Connected</Badge>
        <ActionForm action={removeConnection}>
          <input type="hidden" name="connection_id" value={connection.id} />
          <input type="hidden" name="username" value={username} />
          <SubmitButton size="sm" variant="outline" pendingLabel="Removing…">Remove</SubmitButton>
        </ActionForm>
      </div>
    )
  }

  return (
    <ActionForm action={requestConnection} className="shrink-0">
      <input type="hidden" name="profile_id" value={profileId} />
      <input type="hidden" name="username" value={username} />
      <SubmitButton size="sm" pendingLabel="Sending…">Connect</SubmitButton>
    </ActionForm>
  )
}


