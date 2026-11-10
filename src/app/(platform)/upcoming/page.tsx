import Link from "next/link"
import { Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState, UserAvatar } from "@/components/person"
import { getViewer } from "@/lib/auth"
import { GAME_GENRES } from "@/lib/constants"
import { formatDate } from "@/lib/format"
import { PROMO_PRICE_LABEL } from "@/lib/promo"
import { youtubeThumbnail } from "@/lib/youtube"
import { followGame } from "@/server/actions/platform"
import { getMyPromoPayments, getMyUnpaidPromos, getUpcomingGames } from "@/server/game-promos"

export const metadata = { title: "Upcoming Games" }

export default function UpcomingPage({ searchParams }: { searchParams: Promise<{ genre?: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Upcoming searchParams={searchParams} />
    </Suspense>
  )
}

async function Upcoming({ searchParams }: { searchParams: Promise<{ genre?: string }> }) {
  const params = await searchParams
  const genre = GAME_GENRES.includes(params.genre as (typeof GAME_GENRES)[number]) ? params.genre : ""
  const viewer = await getViewer()
  const [promos, waiting, payments] = await Promise.all([
    getUpcomingGames(genre || undefined),
    getMyUnpaidPromos(),
    viewer?.profile.role === "studio" ? getMyPromoPayments() : Promise.resolve([]),
  ])
  const canPost = viewer?.profile.role === "studio" && Boolean(viewer.page)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Upcoming Games</h1>
          <p className="mt-1 text-sm text-muted-foreground">Trailers and promos from studios. A listing costs {PROMO_PRICE_LABEL}.</p>
        </div>
        {canPost ? (
          <Button size="sm" asChild>
            <Link href="/upcoming/new">Post a trailer</Link>
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/upcoming" className={`rounded-full px-3 py-1 text-sm ${genre ? "bg-card text-muted-foreground" : "bg-primary text-primary-foreground"}`}>All</Link>
        {GAME_GENRES.map((item) => (
          <Link key={item} href={`/upcoming?genre=${encodeURIComponent(item)}`} className={`rounded-full px-3 py-1 text-sm ${genre === item ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{item}</Link>
        ))}
      </div>

      {payments.length > 0 ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Your payments</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {payments.map((promo) => (
              <li key={promo.id} className="flex flex-wrap items-baseline justify-between gap-2">
                <Link className="font-medium text-primary" href={`/upcoming/${promo.id}`}>{promo.game_title}</Link>
                <span className="text-muted-foreground">{PROMO_PRICE_LABEL} · {promo.paid_at ? formatDate(promo.paid_at) : "Paid"}{promo.expires_at ? ` · until ${formatDate(promo.expires_at)}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {waiting.length > 0 ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Waiting for payment</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {waiting.map((promo) => (
              <li key={promo.id}>
                <Link className="font-medium text-primary" href={`/upcoming/${promo.id}`}>{promo.game_title}</Link>
                <span className="text-muted-foreground"> · hidden until you pay {PROMO_PRICE_LABEL}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {promos.length === 0 ? (
        <EmptyState
          title="No upcoming games yet"
          body={canPost ? `Post a YouTube trailer. It appears here after you pay ${PROMO_PRICE_LABEL}.` : "Studio trailers and promos show up here after they are paid for."}
        />
      ) : (
        <div className="space-y-3">
          {promos.map((promo) => {
            const thumb = youtubeThumbnail(promo.youtube_url)
            return (
              <article key={promo.id} className="overflow-hidden rounded-xl border bg-card">
                <Link href={`/upcoming/${promo.id}`} className="block">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="aspect-video w-full object-cover" />
                  ) : null}
                  <div className="space-y-2 p-4">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={promo.page?.name ?? "Studio"} path={promo.page?.logo_path ?? null} className="size-8" />
                      <span className="min-w-0">
                        <span className="block truncate text-base font-semibold">{promo.game_title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{promo.page?.name ?? "Studio"}</span>
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm leading-6">{promo.body}</p>
                    <div className="flex flex-wrap gap-2">
                      {promo.genre ? <Badge>{promo.genre}</Badge> : null}
                      {promo.release_label ? <Badge variant="secondary">{promo.release_label}</Badge> : null}
                      {promo.platforms.map((platform) => <Badge key={platform} variant="outline">{platform}</Badge>)}
                    </div>
                  </div>
                </Link>
                {viewer ? (
                  <form action={followGame} className="px-4 pb-4">
                    <input type="hidden" name="game_name" value={promo.game_title} />
                    <Button type="submit" size="sm" variant="outline">Follow this game</Button>
                  </form>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
