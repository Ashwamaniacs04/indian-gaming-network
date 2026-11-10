import Link from "next/link"
import { Suspense } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/person"
import { TextField } from "@/components/form-kit"
import { getViewer } from "@/lib/auth"
import { followGame } from "@/server/actions/platform"
import { getFollowedGames, getGameBoard } from "@/server/platform-data"

export const metadata = { title: "Games" }

export default function GamesPage({ searchParams }: { searchParams: Promise<{ title?: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Games searchParams={searchParams} />
    </Suspense>
  )
}

async function Games({ searchParams }: { searchParams: Promise<{ title?: string }> }) {
  const params = await searchParams
  const title = params.title?.trim() ?? ""
  const viewer = await getViewer()
  const [followed, board] = await Promise.all([
    getFollowedGames(),
    title.length >= 2 ? getGameBoard(title) : Promise.resolve(null),
  ])
  const following = followed.some((game) => game.game_name.toLowerCase() === title.toLowerCase())

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Games</h1>
        <p className="mt-1 text-sm text-muted-foreground">Follow a game title and see new playtests, jobs, collabs, and paid trailers for it.</p>
      </div>
      {viewer ? (
        <form action={followGame} className="flex flex-wrap gap-2">
          <TextField name="game_name" placeholder="Game title" required className="max-w-xs" />
          <Button type="submit">Follow</Button>
        </form>
      ) : (
        <p className="text-sm"><Link className="font-medium text-primary" href="/login?next=/games">Sign in</Link> to follow a game.</p>
      )}
      {followed.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {followed.map((game) => (
            <Link key={game.game_key} href={`/games?title=${encodeURIComponent(game.game_name)}`} className={`rounded-full px-3 py-1 text-sm ${game.game_name.toLowerCase() === title.toLowerCase() ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
              {game.game_name}
            </Link>
          ))}
        </div>
      ) : null}

      {title.length >= 2 && board ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            {viewer ? (
              <form action={followGame}>
                <input type="hidden" name="game_name" value={title} />
                <Button type="submit" size="sm" variant="outline">{following ? "Unfollow" : "Follow this game"}</Button>
              </form>
            ) : null}
          </div>
          {board.playtests.length === 0 && board.posts.length === 0 && board.promos.length === 0 ? (
            <EmptyState title="Nothing open for this title" body="Playtests, jobs, collabs, and paid trailers that use this exact title show up here." />
          ) : null}
          {board.promos.map((promo) => (
            <Link key={promo.id} href={`/upcoming/${promo.id}`} className="block rounded-xl border bg-card p-4">
              <Badge>Trailer</Badge>
              <span className="mt-2 block font-semibold">{promo.game_title}</span>
              <span className="block text-sm text-muted-foreground">{promo.page?.name}</span>
            </Link>
          ))}
          {board.playtests.map((listing) => (
            <Link key={listing.id} href="/opportunities?tab=playtests" className="block rounded-xl border bg-card p-4">
              <Badge variant="secondary">Playtest</Badge>
              <span className="mt-2 block font-semibold">{listing.title}</span>
              <span className="block text-sm text-muted-foreground">{listing.page.name}</span>
            </Link>
          ))}
          {board.posts.map((post) => (
            <Link key={post.id} href={`/post/${post.id}`} className="block rounded-xl border bg-card p-4">
              <Badge variant="outline">{post.post_type === "job" ? "Job" : "Collab"}</Badge>
              <span className="mt-2 block font-semibold">{post.job_title || post.collab_title}</span>
              <span className="block text-sm text-muted-foreground">{post.page?.name || post.author.display_name}</span>
            </Link>
          ))}
        </section>
      ) : (
        <EmptyState title="Pick a title" body="Follow a game, or open one you already follow, to see what is open." />
      )}
    </div>
  )
}
