"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Briefcase, CalendarDays, Clapperboard, Gamepad2, Home, Search, UserRound } from "lucide-react"
import type { ReactNode } from "react"
import { followPage, unfollowPage } from "@/server/actions/social"
import { signOut } from "@/server/actions/auth"
import { BrandLockup } from "@/components/brand"
import { ThemeSwitch } from "@/components/theme-switch"
import { NotificationListener } from "@/components/notification-listener"
import { UserAvatar } from "@/components/person"
import { VerifiedMark, VerifiedName } from "@/components/verified-mark"
import { Button } from "@/components/ui/button"
import { profileCardGap } from "@/lib/card-gap"
import { roleLabel } from "@/lib/constants"
import { locationLabel } from "@/lib/format"
import type { PlaytestCard, StudioPage, Viewer } from "@/lib/types"

const links = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/upcoming", label: "Upcoming", icon: Clapperboard },
  { href: "/opportunities", label: "Opportunities", icon: Briefcase },
  { href: "/meetups", label: "Meetups", icon: CalendarDays },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/search", label: "Search", icon: Search },
  { href: "/notifications", label: "Alerts", icon: Bell },
]

type RailSuggestions = {
  pages: Array<StudioPage & { following: boolean }>
  playtests: PlaytestCard[]
  featured: (StudioPage & { following: boolean }) | null
  week: Array<{ kind: string; title: string; meta: string; href: string }>
}

export function Shell({
  viewer,
  suggestions,
  children,
}: {
  viewer: Viewer | null
  suggestions: RailSuggestions
  children: ReactNode
}) {
  return (
    <div className="min-h-full">
      {viewer ? <NotificationListener userId={viewer.id} /> : null}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto grid items-center min-[1700px]:grid-cols-[minmax(0,1fr)_72rem_minmax(0,1fr)]">
          <Slogan>Be Coolest Professional</Slogan>
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 min-[1700px]:mx-0 min-[1700px]:max-w-none">
          <BrandLockup href={viewer ? "/feed" : "/"} shortOnMobile />
          <form action="/search" className="mx-auto hidden min-w-0 w-full max-w-md lg:block">
            <label className="relative block">
              <span className="sr-only">Search</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                placeholder="Search people, pages, and posts"
                className="h-9 w-full rounded-full border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
          </form>
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitch />
            {viewer ? (
              <>
                <Button size="sm" asChild>
                  <Link href="/post/new">Post</Link>
                </Button>
                <form action={signOut}>
                  <Button type="submit" variant="ghost" size="sm">Sign out</Button>
                </form>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild><Link href="/login">Sign in</Link></Button>
                <Button size="sm" asChild><Link href="/signup">Join</Link></Button>
              </>
            )}
          </div>
          </div>
          <Slogan>Be Respectful</Slogan>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {viewer ? (
              <Link href={`/u/${viewer.profile.username}`} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <UserAvatar name={viewer.profile.display_name} path={viewer.profile.avatar_path} />
                <span className="min-w-0">
                  <VerifiedName name={viewer.profile.display_name} verified={viewer.profile.verified} className="text-sm font-semibold" />
                  <span className="block truncate text-xs text-muted-foreground">{roleLabel(viewer.profile.role)}</span>
                </span>
              </Link>
            ) : null}
            <DesktopNav viewer={viewer} />
            {viewer ? <FinishCard viewer={viewer} /> : null}
          </div>
        </aside>
        <main className="min-w-0 pb-24 lg:pb-6">{children}</main>
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            <Rail suggestions={suggestions} />
          </div>
        </aside>
      </div>
      <MobileNav viewer={viewer} />
    </div>
  )
}

function DesktopNav({ viewer }: { viewer: Viewer | null }) {
  const pathname = usePathname()
  const profileHref = viewer ? `/u/${viewer.profile.username}` : "/login"
  return (
    <nav className="space-y-1 rounded-xl border bg-card p-2">
      {links.map((link) => (
        <NavItem key={link.href} href={link.href} label={link.label} icon={link.icon} active={pathname.startsWith(link.href)} badge={link.href === "/notifications" ? viewer?.unread ?? 0 : 0} />
      ))}
      <NavItem href={profileHref} label="Profile" icon={UserRound} active={pathname.startsWith("/u/")} badge={0} />
      {viewer?.page ? (
        <Link href={`/p/${viewer.page.slug}`} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
          Your page
        </Link>
      ) : null}
      {viewer ? (
        <Link href="/settings" className={`block rounded-lg px-3 py-2 text-sm hover:bg-muted ${pathname.startsWith("/settings") ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}>
          Settings
        </Link>
      ) : null}
      {viewer?.isAdmin ? (
        <Link href="/admin" className={`block rounded-lg px-3 py-2 text-sm hover:bg-muted ${pathname.startsWith("/admin") ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}>
          Admin
        </Link>
      ) : null}
    </nav>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string
  label: string
  icon: typeof Home
  active: boolean
  badge: number
}) {
  return (
    <Link href={href} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${active ? "bg-primary/10 font-medium text-primary dark:bg-transparent dark:text-white dark:[background-image:linear-gradient(90deg,rgba(92,110,240,0.42),rgba(123,140,255,0.08))]" : "text-muted-foreground hover:bg-muted"}`}>
      <span className="flex items-center gap-2"><Icon className="size-4" />{label}</span>
      {badge > 0 ? <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{badge}</span> : null}
    </Link>
  )
}

function MobileNav({ viewer }: { viewer: Viewer | null }) {
  const pathname = usePathname()
  const profileHref = viewer ? `/u/${viewer.profile.username}` : "/login"
  const items = [...links, { href: profileHref, label: "Profile", icon: UserRound }]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t bg-card lg:hidden">
      {items.map((item) => {
        const active = pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href} className={`flex w-16 shrink-0 flex-col items-center gap-1 px-1 py-2 text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}>
            <Icon className="size-4" />
            <MobileLabel label={item.label} />
          </Link>
        )
      })}
    </nav>
  )
}

function MobileLabel({ label }: { label: string }) {
  if (label === "Upcoming") {
    return (
      <span className="max-w-full text-center text-[10px] leading-tight">
        <span className="hidden min-[400px]:inline">Upcoming</span>
        <span className="min-[400px]:hidden">Games</span>
      </span>
    )
  }
  if (label !== "Opportunities") {
    return <span className="max-w-full truncate text-[10px] leading-tight">{label}</span>
  }
  return (
    <span className="max-w-full text-center text-[10px] leading-tight">
      <span className="hidden min-[360px]:inline">Opportunities</span>
      <span className="min-[360px]:hidden">Board</span>
    </span>
  )
}

function Slogan({ children }: { children: string }) {
  return (
    <p
      className="mx-2 hidden justify-self-center rounded-xl bg-black px-3 py-1.5 text-center text-lg leading-none text-[#ff8a00] min-[1700px]:block"
      style={{ fontFamily: "Milkyway, 'Trebuchet MS', sans-serif" }}
    >
      {children}
    </p>
  )
}

function FinishCard({ viewer }: { viewer: Viewer }) {
  const gap = profileCardGap(viewer.profile, Boolean(viewer.page))
  if (!gap) return null
  return (
    <section className="rounded-xl border bg-card p-4">
      <svg viewBox="0 0 220 72" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2 h-16 w-full text-primary" aria-hidden="true">
        <rect x="8" y="16" width="56" height="40" rx="10" />
        <circle cx="28" cy="36" r="5" />
        <circle cx="44" cy="36" r="5" />
        <path d="M84 24h120M84 36h92M84 48h70" />
      </svg>
      <h2 className="text-sm font-semibold">{gap.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{gap.body}</p>
      <Button size="sm" className="mt-3" asChild>
        <Link href={gap.href}>Add details</Link>
      </Button>
    </section>
  )
}

function Rail({ suggestions }: { suggestions: RailSuggestions }) {
  return (
    <>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Pages to follow</h2>
        <div className="mt-3 space-y-3">
          {suggestions.pages.length === 0 ? <p className="text-sm text-muted-foreground">Follow a studio page when one is listed here. Followed pages fill your Following feed.</p> : null}
          {suggestions.pages.map((page) => (
            <div key={page.id} className="flex items-center justify-between gap-2">
              <Link href={`/p/${page.slug}`} className="flex min-w-0 items-center gap-2">
                <UserAvatar name={page.name} path={page.logo_path} className="size-8" />
                <span className="min-w-0">
                  <VerifiedName name={page.name} verified={page.verified} className="text-sm font-medium" />
                  <span className="block truncate text-xs text-muted-foreground">{page.headline || locationLabel(page.city, page.state) || "Studio"}</span>
                </span>
              </Link>
              <form action={page.following ? unfollowPage : followPage}>
                <input type="hidden" name="page_id" value={page.id} />
                <input type="hidden" name="slug" value={page.slug} />
                <Button type="submit" size="sm" variant={page.following ? "outline" : "default"}>
                  {page.following ? "Following" : "Follow"}
                </Button>
              </form>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Open playtests</h2>
        <div className="mt-3 space-y-3">
          {suggestions.playtests.length === 0 ? <p className="text-sm text-muted-foreground">When a studio posts a playtest, open it from Opportunities.</p> : null}
          {suggestions.playtests.map((listing) => (
            <Link key={listing.id} href="/opportunities?tab=playtests" className="flex items-center gap-2">
              <UserAvatar name={listing.page.name} path={listing.page.logo_path} className="size-8" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{listing.title}</span>
                <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                  <span className="truncate">{listing.game_title} · {listing.page.name}</span>
                  {listing.page.verified ? <VerifiedMark /> : null}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="min-w-0 text-sm font-semibold">
            {suggestions.featured ? <VerifiedName name={suggestions.featured.name} verified={suggestions.featured.verified} /> : "Featured page"}
          </h2>
          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Sponsored</span>
        </div>
        {suggestions.featured ? (
          <div className="mt-3">
            <Link href={`/p/${suggestions.featured.slug}`} className="flex items-center gap-2">
              <UserAvatar name={suggestions.featured.name} path={suggestions.featured.logo_path} className="size-8" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">Studio page</span>
                <span className="block truncate text-xs text-muted-foreground">{suggestions.featured.headline || locationLabel(suggestions.featured.city, suggestions.featured.state) || "Studio"}</span>
              </span>
            </Link>
            <Button size="sm" variant="outline" className="mt-3" asChild>
              <Link href={`/p/${suggestions.featured.slug}`}>View page</Link>
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">A studio page can be featured here.</p>
        )}
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">This week</h2>
        <div className="mt-3 space-y-3">
          {suggestions.week.length === 0 ? <p className="text-sm text-muted-foreground">Nothing new this week.</p> : null}
          {suggestions.week.map((item) => (
            <Link key={`${item.kind}-${item.href}-${item.title}`} href={item.href} className="block">
              <span className="block text-sm font-medium">{item.kind}</span>
              <span className="block truncate text-xs text-muted-foreground">{item.title} · {item.meta}</span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}

export function ShellFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-14 animate-pulse rounded-xl bg-card" />
      <div className="mt-6 h-64 animate-pulse rounded-xl bg-card" />
    </div>
  )
}
