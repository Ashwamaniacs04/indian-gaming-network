import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState, UserAvatar } from "@/components/person"
import { PostCard } from "@/components/post-card"
import { roleLabel } from "@/lib/constants"
import { formatMonth, locationLabel, publicStorageUrl } from "@/lib/format"
import type { ExperienceItem, PortfolioItem, PostCard as PostCardData, Profile, StudioPage, Viewer } from "@/lib/types"

export function ProfileView({
  profile,
  page,
  portfolio,
  experience,
  posts,
  viewer,
}: {
  profile: Profile
  page: StudioPage | null
  portfolio: PortfolioItem[]
  experience: ExperienceItem[]
  posts: PostCardData[]
  viewer: Viewer | null
}) {
  const banner = publicStorageUrl("banners", profile.banner_path)
  const isOwner = viewer?.id === profile.id
  const details = profile.role_details

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
              <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
            {isOwner ? (
              <Button variant="outline" size="sm" asChild><Link href="/settings">Edit profile</Link></Button>
            ) : null}
          </div>
          {profile.headline ? <p className="mt-2 text-sm">{profile.headline}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge>{roleLabel(profile.role)}</Badge>
            {locationLabel(profile.city, profile.state) ? <Badge variant="outline">{locationLabel(profile.city, profile.state)}</Badge> : null}
            {profile.availability ? <Badge variant="secondary">{profile.availability}</Badge> : null}
          </div>
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

      <RoleBlock profile={profile} page={page} />

      {(profile.role === "cosplay_artist" || profile.role === "streamer" || portfolio.length > 0) ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Showcase</h2>
          {portfolio.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{isOwner ? "Add a showcase image from Settings so people can see your work." : "No showcase images yet."}</p> : (
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

      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Contact</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {profile.contact_email ? <li>{profile.contact_email}</li> : null}
          {profile.website ? <li><a className="text-primary" href={profile.website}>{profile.website}</a></li> : null}
          {profile.socials.youtube ? <li>YouTube: {profile.socials.youtube}</li> : null}
          {profile.socials.twitch ? <li>Twitch: {profile.socials.twitch}</li> : null}
          {profile.socials.instagram ? <li>Instagram: {profile.socials.instagram}</li> : null}
          {profile.socials.discord ? <li>Discord: {profile.socials.discord}</li> : null}
          {!profile.contact_email && !profile.website ? <li className="text-muted-foreground">No public contact details yet.</li> : null}
        </ul>
      </section>

      <div className="space-y-3">
        {posts.length === 0 ? <EmptyState title="No posts yet" body={isOwner ? "Publish an image, video, job, or collab from the feed so it shows up here." : "This profile has not published a post yet."} /> : posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)}
      </div>
    </div>
  )
}

function RoleBlock({ profile, page }: { profile: Profile; page: StudioPage | null }) {
  const details = profile.role_details
  if (profile.role === "gamer") {
    return (
      <InfoList title="Play" rows={[
        ["Platforms", details.platforms?.join(", ")],
        ["Favorite games", details.favorite_games?.join(", ")],
      ]} />
    )
  }
  if (profile.role === "tester") {
    return (
      <InfoList title="Testing" rows={[
        ["Experience", details.years_experience ? `${details.years_experience} years` : null],
        ["Platforms", details.platforms?.join(", ")],
        ["Games tested", details.games_tested?.join(", ")],
      ]} />
    )
  }
  if (profile.role === "streamer") {
    return (
      <InfoList title="Channel" rows={[
        ["Schedule", details.schedule],
        ["Typical viewers", details.avg_viewers ? String(details.avg_viewers) : null],
        ["Platforms", details.platforms?.join(", ")],
      ]} />
    )
  }
  if (profile.role === "cosplay_artist") {
    return (
      <InfoList title="Cosplay" rows={[
        ["Characters", details.characters?.join(", ")],
        ["Conventions", details.conventions?.join(", ")],
      ]} />
    )
  }
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Studio page</h2>
      {page ? (
        <Link href={`/p/${page.slug}`} className="mt-2 block text-sm font-medium text-primary">{page.name}</Link>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">This studio has not published a page yet.</p>
      )}
    </section>
  )
}

function InfoList({ title, rows }: { title: string; rows: Array<[string, string | null | undefined]> }) {
  const visible = rows.filter((row) => row[1])
  if (visible.length === 0) return null
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <dl className="mt-2 space-y-2">
        {visible.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
