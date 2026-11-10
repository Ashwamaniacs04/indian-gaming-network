import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PromoPayButton } from "@/components/promo-pay-button"
import { UserAvatar } from "@/components/person"
import { getViewer } from "@/lib/auth"
import { formatDate } from "@/lib/format"
import { PROMO_PRICE_LABEL, promoIsLive, promoPaymentsReady } from "@/lib/promo"
import { youtubeId } from "@/lib/youtube"
import { removeUnpaidPromo } from "@/server/actions/promos"
import { getGamePromo } from "@/server/game-promos"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const promo = await getGamePromo(id)
  return { title: promo?.game_title ?? "Upcoming game" }
}

export default function PromoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Promo params={params} />
    </Suspense>
  )
}

async function Promo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [promo, viewer] = await Promise.all([getGamePromo(id), getViewer()])
  if (!promo) notFound()
  const owned = viewer?.id === promo.author_id
  const live = promoIsLive(promo)
  if (!live && !owned) notFound()
  const needsPayment = owned && !live
  const videoId = youtubeId(promo.youtube_url)

  return (
    <article className="space-y-4">
      <section className="overflow-hidden rounded-xl border bg-card">
        {videoId ? (
          <iframe
            className="aspect-video w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={promo.game_title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : null}
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            {promo.page ? (
              <Link href={`/p/${promo.page.slug}`} className="flex min-w-0 items-center gap-2">
                <UserAvatar name={promo.page.name} path={promo.page.logo_path} className="size-10" />
                <span className="min-w-0">
                  <span className="block truncate text-lg font-semibold">{promo.game_title}</span>
                  <span className="block truncate text-sm text-muted-foreground">{promo.page.name}</span>
                </span>
              </Link>
            ) : (
              <h1 className="text-lg font-semibold">{promo.game_title}</h1>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {promo.genre ? <Badge>{promo.genre}</Badge> : null}
            {promo.release_label ? <Badge variant="secondary">{promo.release_label}</Badge> : null}
            {promo.platforms.map((platform) => <Badge key={platform} variant="outline">{platform}</Badge>)}
            {live && promo.expires_at ? <Badge variant="outline">Listed until {formatDate(promo.expires_at)}</Badge> : null}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6">{promo.body}</p>
        </div>
      </section>

      {needsPayment ? (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">{promo.payment_status === "paid" ? `Pay ${PROMO_PRICE_LABEL} to list it for another 30 days` : `Pay ${PROMO_PRICE_LABEL} to publish`}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{promo.payment_status === "paid" ? "This listing has ended. A new payment shows the trailer again for 30 days." : "This trailer is hidden until the payment goes through. It stays public for 30 days."}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {promoPaymentsReady() ? (
              <PromoPayButton promoId={promo.id} gameTitle={promo.game_title} />
            ) : (
              <p className="text-sm text-muted-foreground">Payment is not set up on the server yet, so this trailer stays hidden.</p>
            )}
            {promo.payment_status !== "paid" ? (
              <form action={removeUnpaidPromo}>
                <input type="hidden" name="promo_id" value={promo.id} />
                <Button type="submit" variant="outline" size="sm">Remove</Button>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}
    </article>
  )
}
