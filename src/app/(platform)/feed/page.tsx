import { Suspense } from "react"
import Link from "next/link"
import { Composer } from "@/components/composer"
import { EmptyState } from "@/components/person"
import { PostCard } from "@/components/post-card"
import { requireUser } from "@/lib/auth"
import { getFeed } from "@/server/queries"

export const metadata = { title: "Feed" }

export default function FeedPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Feed searchParams={searchParams} />
    </Suspense>
  )
}

async function Feed({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const viewer = await requireUser()
  const params = await searchParams
  const scope = params.scope === "following" ? "following" : "all"
  const { posts } = await getFeed(scope)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Link href="/feed" className={`rounded-full px-3 py-1 text-sm ${scope === "all" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>All</Link>
        <Link href="/feed?scope=following" className={`rounded-full px-3 py-1 text-sm ${scope === "following" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>Following</Link>
      </div>
      <Composer
        pageName={viewer.page?.name ?? null}
        authorName={viewer.profile.display_name}
        avatarPath={viewer.profile.avatar_path}
      />
      {posts.length === 0 ? (
        <EmptyState
          title={scope === "following" ? "No posts from pages you follow" : "The feed is quiet"}
          body={scope === "following" ? "Follow a studio page, then come back to this filter." : "Share an update above: an image, a YouTube link, a job, or a collab."}
        />
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)
      )}
    </div>
  )
}
