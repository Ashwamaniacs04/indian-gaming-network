import Link from "next/link"
import { Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState, UserAvatar } from "@/components/person"
import { PostCard } from "@/components/post-card"
import { ActionForm, AreaField, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"
import { expressInterest, setInterestStatus, setPlaytestStatus } from "@/server/actions/social"
import { saveListing } from "@/server/actions/platform"
import { COLLAB_ROLES, INDIAN_STATES } from "@/lib/constants"
import { formatWhen, locationLabel } from "@/lib/format"
import { getViewer } from "@/lib/auth"
import { getMyApplications, getSavedTargetIds } from "@/server/platform-data"
import { getInterestInbox, getOpportunityPosts, getPlaytests, getPostsByIds } from "@/server/queries"

export const metadata = { title: "Opportunities" }

type Filters = { tab?: string; q?: string; state?: string; location?: string; pay?: string; role?: string }

const TABS = ["playtests", "jobs", "collabs", "inbox", "mine", "saved"] as const

export default function OpportunitiesPage({ searchParams }: { searchParams: Promise<Filters> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Opportunities searchParams={searchParams} />
    </Suspense>
  )
}

async function Opportunities({ searchParams }: { searchParams: Promise<Filters> }) {
  const params = await searchParams
  const tab = TABS.includes(params.tab as (typeof TABS)[number]) ? (params.tab as (typeof TABS)[number]) : "playtests"
  const viewer = await getViewer()
  const saved = viewer ? await getSavedTargetIds() : { posts: [] as string[], playtests: [] as string[] }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Opportunities</h1>
        {viewer?.page ? <Button size="sm" asChild><Link href="/opportunities/playtests/new">Post a playtest</Link></Button> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Tab href="/opportunities?tab=playtests" active={tab === "playtests"}>Playtests</Tab>
        <Tab href="/opportunities?tab=jobs" active={tab === "jobs"}>Jobs</Tab>
        <Tab href="/opportunities?tab=collabs" active={tab === "collabs"}>Collabs</Tab>
        {viewer ? <Tab href="/opportunities?tab=inbox" active={tab === "inbox"}>Inbox</Tab> : null}
        {viewer ? <Tab href="/opportunities?tab=mine" active={tab === "mine"}>My applications</Tab> : null}
        {viewer ? <Tab href="/opportunities?tab=saved" active={tab === "saved"}>Saved</Tab> : null}
      </div>

      {tab === "playtests" ? (
        <>
          <form className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-5" action="/opportunities">
            <input type="hidden" name="tab" value="playtests" />
            <TextField name="q" placeholder="Game or title" defaultValue={params.q ?? ""} />
            <NativeSelect name="state" defaultValue={params.state ?? ""}>
              <option value="">Any state</option>
              {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </NativeSelect>
            <NativeSelect name="location" defaultValue={params.location ?? ""}>
              <option value="">Any location</option>
              <option value="remote">Remote</option>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
            </NativeSelect>
            <NativeSelect name="pay" defaultValue={params.pay ?? ""}>
              <option value="">Any pay</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </NativeSelect>
            <Button type="submit">Filter</Button>
          </form>
          <PlaytestList q={params.q} state={params.state} location={params.location} pay={params.pay} viewerId={viewer?.id ?? null} viewerPageSlug={viewer?.page?.slug ?? null} savedIds={saved.playtests} />
        </>
      ) : null}

      {tab === "jobs" ? <PostList type="job" q={params.q} viewer={viewer} savedIds={saved.posts} /> : null}
      {tab === "collabs" ? (
        <>
          <form className="flex flex-wrap gap-2" action="/opportunities">
            <input type="hidden" name="tab" value="collabs" />
            <NativeSelect name="role" defaultValue={params.role ?? ""} className="max-w-xs">
              <option value="">Any role</option>
              {COLLAB_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </NativeSelect>
            <Button type="submit">Filter</Button>
          </form>
          <PostList type="collab" q={params.q} role={params.role} viewer={viewer} savedIds={saved.posts} />
        </>
      ) : null}
      {tab === "inbox" ? <Inbox /> : null}
      {tab === "mine" ? <MyApplications /> : null}
      {tab === "saved" ? <Saved saved={saved} viewer={viewer} /> : null}
    </div>
  )
}

function Tab({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link href={href} className={`rounded-full px-3 py-1 text-sm ${active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
      {children}
    </Link>
  )
}

async function PlaytestList({
  q,
  state,
  location,
  pay,
  viewerId,
  viewerPageSlug,
  savedIds,
}: {
  q?: string
  state?: string
  location?: string
  pay?: string
  viewerId: string | null
  viewerPageSlug: string | null
  savedIds: string[]
}) {
  const listings = await getPlaytests({ q, state, location, pay })
  if (listings.length === 0) {
    return <EmptyState title="No open playtests" body="If you run a studio, post a playtest from your page." />
  }
  return (
    <div className="space-y-3">
      {listings.map((listing) => {
        const owned = viewerPageSlug === listing.page.slug
        return (
          <article key={listing.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/p/${listing.page.slug}`} className="text-xs font-medium text-primary">{listing.page.name}</Link>
                <h2 className="text-lg font-semibold">{listing.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {listing.game_title} · {listing.location_type} · {locationLabel(listing.city, listing.state) || "India"}
                </p>
              </div>
              <Badge>{listing.status}</Badge>
            </div>
            <p className="mt-3 text-sm whitespace-pre-wrap">{listing.description}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {listing.platforms.map((platform) => <Badge key={platform} variant="secondary">{platform}</Badge>)}
              {listing.compensation ? <Badge variant="outline">{listing.compensation}</Badge> : null}
            </div>
            {viewerId ? (
              <form action={saveListing} className="mt-3">
                <input type="hidden" name="target_type" value="playtest" />
                <input type="hidden" name="target_id" value={listing.id} />
                <Button type="submit" size="sm" variant="outline">{savedIds.includes(listing.id) ? "Saved" : "Save"}</Button>
              </form>
            ) : null}
            {viewerId && !owned ? (
              <ActionForm action={expressInterest} className="mt-4 space-y-2">
                <input type="hidden" name="playtest_id" value={listing.id} />
                <AreaField name="message" rows={3} placeholder="Introduce yourself" />
                <SubmitButton pendingLabel="Sending…">Express interest</SubmitButton>
              </ActionForm>
            ) : (
              <p className="mt-3 text-sm"><Link className="font-medium text-primary" href="/login">Sign in</Link> to express interest.</p>
            )}
            {owned ? (
              <form action={setPlaytestStatus} className="mt-3">
                <input type="hidden" name="id" value={listing.id} />
                <input type="hidden" name="status" value="closed" />
                <Button type="submit" variant="outline" size="sm">Close listing</Button>
              </form>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

async function PostList({
  type,
  q,
  role,
  viewer,
  savedIds,
}: {
  type: "job" | "collab"
  q?: string
  role?: string
  viewer: Awaited<ReturnType<typeof getViewer>>
  savedIds: string[]
}) {
  const posts = await getOpportunityPosts(type, q, role)
  if (posts.length === 0) return <EmptyState title={type === "job" ? "No open jobs" : "No open collabs"} body={type === "job" ? "Post a job from the feed when you are hiring." : "Post a collab from the feed when you need people."} />
  return <div className="space-y-3">{posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} showInterest saved={savedIds.includes(post.id)} />)}</div>
}

async function MyApplications() {
  const items = await getMyApplications()
  if (items.length === 0) return <EmptyState title="No applications yet" body="When you express interest in a playtest, job, or collab, the status shows up here." />
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="text-xs text-muted-foreground">{item.kind} · {formatWhen(item.created_at)}</p>
            </div>
            <Badge variant="secondary">{item.status}</Badge>
          </div>
          {item.message ? <p className="mt-2 text-sm whitespace-pre-wrap">{item.message}</p> : null}
        </article>
      ))}
    </div>
  )
}

async function Saved({
  saved,
  viewer,
}: {
  saved: { posts: string[]; playtests: string[] }
  viewer: Awaited<ReturnType<typeof getViewer>>
}) {
  const [posts, playtests] = await Promise.all([
    getPostsByIds(saved.posts),
    getPlaytests({ ids: saved.playtests }),
  ])
  if (posts.length === 0 && playtests.length === 0) {
    return <EmptyState title="Nothing saved" body="Save a playtest, job, or collab and it stays in this list." />
  }
  return (
    <div className="space-y-3">
      {playtests.map((listing) => (
        <article key={listing.id} className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">{listing.title}</h2>
          <p className="text-xs text-muted-foreground">{listing.game_title} · {listing.page.name}</p>
        </article>
      ))}
      {posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} saved showInterest />)}
    </div>
  )
}

async function Inbox() {
  const viewer = await getViewer()
  if (!viewer) return null
  const items = await getInterestInbox()
  if (items.length === 0) return <EmptyState title="No applications yet" body="When someone applies to your job, collab, or playtest, you will see it here." />
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <article key={item.id} className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserAvatar name={item.applicant_name} path={item.applicant_avatar_path} />
              <div>
                <Link href={`/u/${item.applicant_username}`} className="text-sm font-semibold">{item.applicant_name}</Link>
                <p className="text-xs text-muted-foreground">{item.kind} · {item.target_title} · {formatWhen(item.created_at)}</p>
              </div>
            </div>
            <Badge variant="secondary">{item.status}</Badge>
          </div>
          {item.message ? <p className="mt-3 text-sm whitespace-pre-wrap">{item.message}</p> : null}
          {item.status === "pending" ? (
            <div className="mt-3 flex gap-2">
              <form action={setInterestStatus}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="status" value="accepted" />
                <Button type="submit" size="sm">Accept</Button>
              </form>
              <form action={setInterestStatus}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="status" value="declined" />
                <Button type="submit" size="sm" variant="outline">Decline</Button>
              </form>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  )
}
