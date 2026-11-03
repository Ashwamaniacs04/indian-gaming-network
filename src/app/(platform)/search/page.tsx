import Link from "next/link"
import { Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState, UserAvatar } from "@/components/person"
import { PostCard } from "@/components/post-card"
import { NativeSelect, TextField } from "@/components/form-kit"
import { INDIAN_STATES, POST_TYPE_OPTIONS, ROLE_OPTIONS, roleLabel } from "@/lib/constants"
import { locationLabel } from "@/lib/format"
import { getViewer } from "@/lib/auth"
import { getPlaytests, searchPages, searchPeople, searchPosts } from "@/server/queries"

export const metadata = { title: "Search" }

type Filters = { q?: string; tab?: string; role?: string; state?: string; post_type?: string }

export default function SearchPage({ searchParams }: { searchParams: Promise<Filters> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Search searchParams={searchParams} />
    </Suspense>
  )
}

async function Search({ searchParams }: { searchParams: Promise<Filters> }) {
  const params = await searchParams
  const tab = params.tab === "pages" || params.tab === "posts" || params.tab === "playtests" ? params.tab : "people"
  const viewer = await getViewer()
  const q = params.q ?? ""

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Search</h1>
      <form action="/search" className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2">
        <input type="hidden" name="tab" value={tab} />
        <TextField name="q" placeholder="Name, skill, game, or title" defaultValue={q} />
        {tab === "people" ? (
          <NativeSelect name="role" defaultValue={params.role ?? ""}>
            <option value="">Any role</option>
            {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </NativeSelect>
        ) : null}
        {tab === "posts" ? (
          <NativeSelect name="post_type" defaultValue={params.post_type ?? ""}>
            <option value="">Any post type</option>
            {POST_TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </NativeSelect>
        ) : null}
        {tab === "people" || tab === "pages" ? (
          <NativeSelect name="state" defaultValue={params.state ?? ""}>
            <option value="">Any state</option>
            {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
          </NativeSelect>
        ) : null}
        <Button type="submit">Search</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Tab href={hrefFor("people", params)} active={tab === "people"}>People</Tab>
        <Tab href={hrefFor("pages", params)} active={tab === "pages"}>Pages</Tab>
        <Tab href={hrefFor("posts", params)} active={tab === "posts"}>Posts</Tab>
        <Tab href={hrefFor("playtests", params)} active={tab === "playtests"}>Playtests</Tab>
      </div>
      {tab === "people" ? <People q={q} role={params.role} state={params.state} /> : null}
      {tab === "pages" ? <Pages q={q} state={params.state} /> : null}
      {tab === "posts" ? <Posts q={q} postType={params.post_type} viewer={viewer} /> : null}
      {tab === "playtests" ? <Playtests q={q} /> : null}
    </div>
  )
}

function hrefFor(tab: string, params: Filters) {
  const query = new URLSearchParams()
  query.set("tab", tab)
  if (params.q) query.set("q", params.q)
  if (params.state && (tab === "people" || tab === "pages")) query.set("state", params.state)
  if (params.role && tab === "people") query.set("role", params.role)
  if (params.post_type && tab === "posts") query.set("post_type", params.post_type)
  return `/search?${query.toString()}`
}

function Tab({ href, active, children }: { href: string; active: boolean; children: string }) {
  return <Link href={href} className={`rounded-full px-3 py-1 text-sm ${active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{children}</Link>
}

async function People({ q, role, state }: { q: string; role?: string; state?: string }) {
  const people = await searchPeople({ q, role, state })
  if (people.length === 0) return <EmptyState title="No people found" body="Try another name, role, or state." />
  return (
    <div className="space-y-2">
      {people.map((person) => (
        <Link key={person.id} href={`/u/${person.username}`} className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <UserAvatar name={person.display_name} path={person.avatar_path} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{person.display_name}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {roleLabel(person.role)} · {locationLabel(person.city, person.state) || "India"}
            </span>
          </span>
        </Link>
      ))}
    </div>
  )
}

async function Pages({ q, state }: { q: string; state?: string }) {
  const pages = await searchPages({ q, state })
  if (pages.length === 0) return <EmptyState title="No pages found" body="Studio pages will appear here once they are created." />
  return (
    <div className="space-y-2">
      {pages.map((page) => (
        <Link key={page.id} href={`/p/${page.slug}`} className="block rounded-xl border bg-card p-3">
          <span className="block text-sm font-semibold">{page.name}</span>
          <span className="block text-xs text-muted-foreground">{page.headline || locationLabel(page.city, page.state) || "Studio"}</span>
        </Link>
      ))}
    </div>
  )
}

async function Posts({ q, postType, viewer }: { q: string; postType?: string; viewer: Awaited<ReturnType<typeof getViewer>> }) {
  const posts = await searchPosts({ q, postType })
  if (posts.length === 0) return <EmptyState title="No posts found" body="Try another word or post type." />
  return <div className="space-y-3">{posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)}</div>
}

async function Playtests({ q }: { q: string }) {
  const listings = await getPlaytests({ q })
  if (listings.length === 0) return <EmptyState title="No playtests found" body="Try a game title." />
  return (
    <div className="space-y-2">
      {listings.map((listing) => (
        <Link key={listing.id} href="/opportunities?tab=playtests" className="block rounded-xl border bg-card p-3">
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{listing.title}</span>
            <Badge variant="secondary">{listing.page.name}</Badge>
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">{listing.game_title}</span>
        </Link>
      ))}
    </div>
  )
}
