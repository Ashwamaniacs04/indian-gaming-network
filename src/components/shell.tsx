"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Briefcase, Home, Search, UserRound } from "lucide-react"
import type { ReactNode } from "react"
import { followPage, unfollowPage } from "@/server/actions/social"
import { signOut } from "@/server/actions/auth"
import { NotificationListener } from "@/components/notification-listener"
import { UserAvatar } from "@/components/person"
import { Button } from "@/components/ui/button"
import { locationLabel } from "@/lib/format"
import type { PlaytestCard, StudioPage, Viewer } from "@/lib/types"

const links = [
  { href: "/feed", label: "Feed", icon: Home },
  { href: "/opportunities", label: "Opportunities", icon: Briefcase },
  { href: "/search", label: "Search", icon: Search },
  { href: "/notifications", label: "Alerts", icon: Bell },
]

export function Shell({
  viewer,
  suggestions,
  children,
}: {
  viewer: Viewer | null
  suggestions: {
    pages: Array<StudioPage & { following: boolean }>
    playtests: PlaytestCard[]
  }
  children: ReactNode
}) {
  return (
    <div className="min-h-full">
      {viewer ? <NotificationListener userId={viewer.id} /> : null}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link href={viewer ? "/feed" : "/"} className="truncate text-sm font-semibold text-primary">
            Indian Gaming Network
          </Link>
          <div className="flex items-center gap-2">
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
      </header>
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-4">
            {viewer ? (
              <Link href={`/u/${viewer.profile.username}`} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <UserAvatar name={viewer.profile.display_name} path={viewer.profile.avatar_path} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{viewer.profile.display_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{viewer.profile.username}</span>
                </span>
              </Link>
            ) : null}
            <DesktopNav viewer={viewer} />
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
    <Link href={href} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"}`}>
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
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card lg:hidden">
      {items.map((item) => {
        const active = pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link key={item.href} href={item.href} className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}>
            <Icon className="size-4" />
            <span className="max-w-full truncate">{item.label === "Opportunities" ? "Listings" : item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function Rail({
  suggestions,
}: {
  suggestions: {
    pages: Array<StudioPage & { following: boolean }>
    playtests: PlaytestCard[]
  }
}) {
  return (
    <>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Pages to follow</h2>
        <div className="mt-3 space-y-3">
          {suggestions.pages.length === 0 ? <p className="text-sm text-muted-foreground">Studio pages will show up here.</p> : null}
          {suggestions.pages.map((page) => (
            <div key={page.id} className="flex items-center justify-between gap-2">
              <Link href={`/p/${page.slug}`} className="min-w-0">
                <span className="block truncate text-sm font-medium">{page.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{page.headline || locationLabel(page.city, page.state) || "Studio"}</span>
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
          {suggestions.playtests.length === 0 ? <p className="text-sm text-muted-foreground">No open playtests yet.</p> : null}
          {suggestions.playtests.map((listing) => (
            <Link key={listing.id} href="/opportunities?tab=playtests" className="block">
              <span className="block text-sm font-medium">{listing.title}</span>
              <span className="block text-xs text-muted-foreground">{listing.game_title} · {listing.page?.name}</span>
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
