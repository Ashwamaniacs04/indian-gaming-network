import { Suspense } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PostCard } from "@/components/post-card"
import { UserAvatar } from "@/components/person"
import { followPage, unfollowPage, expressInterest } from "@/server/actions/social"
import { ActionForm, AreaField, SubmitButton } from "@/components/form-kit"
import { getViewer } from "@/lib/auth"
import { locationLabel, publicStorageUrl } from "@/lib/format"
import { getFollowState, getPageBySlug, getPlaytestsByPage, getPostsByPage } from "@/server/queries"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: slug }
}

export default function StudioPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <PageView params={params} />
    </Suspense>
  )
}

async function PageView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPageBySlug(slug)
  if (!page) notFound()
  const [follow, playtests, posts, viewer] = await Promise.all([
    getFollowState(page.id),
    getPlaytestsByPage(page.id),
    getPostsByPage(page.id),
    getViewer(),
  ])
  const banner = publicStorageUrl("banners", page.banner_path)
  const owned = viewer?.id === page.owner_id

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="h-32 bg-gradient-to-r from-blue-900 to-blue-500 sm:h-40">
          {banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={banner} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="px-4 pb-5">
          <div className="-mt-8 flex items-end justify-between gap-3">
            <UserAvatar name={page.name} path={page.logo_path} className="size-20 ring-4 ring-card" />
            <div className="flex gap-2">
              {owned ? <Button variant="outline" size="sm" asChild><Link href="/page/edit">Edit page</Link></Button> : null}
              {!owned && viewer ? (
                <form action={follow.following ? unfollowPage : followPage}>
                  <input type="hidden" name="page_id" value={page.id} />
                  <input type="hidden" name="slug" value={page.slug} />
                  <Button type="submit" size="sm" variant={follow.following ? "outline" : "default"}>
                    {follow.following ? "Following" : "Follow"}
                  </Button>
                </form>
              ) : null}
              {!viewer ? <Button size="sm" asChild><Link href="/login">Follow</Link></Button> : null}
            </div>
          </div>
          <h1 className="mt-3 text-2xl font-semibold">{page.name}</h1>
          <p className="text-sm text-muted-foreground">{follow.count} followers</p>
          {page.headline ? <p className="mt-2 text-sm">{page.headline}</p> : null}
          {locationLabel(page.city, page.state) ? <p className="mt-1 text-sm text-muted-foreground">{locationLabel(page.city, page.state)}</p> : null}
        </div>
      </section>

      {page.about ? <section className="rounded-xl border bg-card p-4"><h2 className="text-sm font-semibold">About</h2><p className="mt-2 text-sm whitespace-pre-wrap">{page.about}</p></section> : null}

      {page.games.length > 0 || page.specialties.length > 0 ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Games and specialties</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...page.games, ...page.specialties].map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Playtests</h2>
        {playtests.length === 0 ? <p className="text-sm text-muted-foreground">No playtests from this page yet.</p> : playtests.map((listing) => (
          <article key={listing.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">{listing.title}</h3>
              <Badge variant={listing.status === "open" ? "default" : "secondary"}>{listing.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{listing.game_title} · {listing.location_type}</p>
            <p className="mt-2 text-sm whitespace-pre-wrap">{listing.description}</p>
            {listing.status === "open" && viewer && !owned ? (
              <ActionForm action={expressInterest} className="mt-3 space-y-2">
                <input type="hidden" name="playtest_id" value={listing.id} />
                <AreaField name="message" rows={3} placeholder="Tell the studio why you want in" />
                <SubmitButton pendingLabel="Sending…">Express interest</SubmitButton>
              </ActionForm>
            ) : null}
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Posts</h2>
        {posts.map((post) => <PostCard key={post.id} post={post} viewer={viewer} />)}
      </section>
    </div>
  )
}
