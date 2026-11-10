import { Suspense } from "react"
import Link from "next/link"
import { Composer } from "@/components/composer"
import { EmptyState } from "@/components/person"
import { PostCard } from "@/components/post-card"
import { requireUser } from "@/lib/auth"
import { POST_TYPE_OPTIONS, postTypeLabel } from "@/lib/constants"
import { POST_TYPES, type PostType } from "@/lib/types"
import { getFeed } from "@/server/queries"

export const metadata = { title: "Feed" }

type FeedParams = { scope?: string; type?: string }

export default function FeedPage({ searchParams }: { searchParams: Promise<FeedParams> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Feed searchParams={searchParams} />
    </Suspense>
  )
}

async function Feed({ searchParams }: { searchParams: Promise<FeedParams> }) {
  const viewer = await requireUser()
  const params = await searchParams
  const scope = params.scope === "following" ? "following" : "all"
  const type = POST_TYPES.find((item) => item === params.type)
  const { posts } = await getFeed(scope, type)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Filter href={feedHref(scope)} active={!type}>All posts</Filter>
        {POST_TYPE_OPTIONS.map((option) => (
          <Filter key={option.value} href={feedHref(scope, option.value)} active={type === option.value}>
            {option.label}
          </Filter>
        ))}
      </div>
      <div className="flex gap-2">
        <Filter href={feedHref("all", type)} active={scope === "all"}>All</Filter>
        <Filter href={feedHref("following", type)} active={scope === "following"}>Following</Filter>
      </div>
      <Composer
        pageName={viewer.page?.name ?? null}
        authorName={viewer.profile.display_name}
        avatarPath={viewer.profile.avatar_path}
      />
      {posts.length === 0 ? (
        <EmptyState
          title={emptyTitle(scope, type)}
          body={emptyBody(scope, type)}
        />
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)
      )}
    </div>
  )
}

function feedHref(scope: "all" | "following", type?: PostType) {
  const query = new URLSearchParams()
  if (scope === "following") query.set("scope", "following")
  if (type) query.set("type", type)
  const text = query.toString()
  return text ? `/feed?${text}` : "/feed"
}

function emptyTitle(scope: "all" | "following", type?: PostType) {
  if (type && scope === "following") return `No ${postTypeLabel(type)} posts from pages you follow`
  if (type) return `No ${postTypeLabel(type)} posts yet`
  if (scope === "following") return "No posts from pages you follow"
  return "The feed is quiet"
}

function emptyBody(scope: "all" | "following", type?: PostType) {
  if (scope === "following") return "Follow a studio page, then come back to this filter."
  if (type) return `Posts in ${postTypeLabel(type)} show up here.`
  return "Share an update above: an image, a YouTube link, a job, or a collab."
}

function Filter({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link href={href} className={`rounded-full px-3 py-1 text-sm ${active ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
      {children}
    </Link>
  )
}
