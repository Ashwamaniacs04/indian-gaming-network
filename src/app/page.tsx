import Link from "next/link"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Heart, MessageCircle } from "lucide-react"
import { BrandLockup } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { ROLE_OPTIONS } from "@/lib/constants"
import { getViewer } from "@/lib/auth"

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <HomeContent />
    </Suspense>
  )
}

async function HomeContent() {
  const viewer = await getViewer()
  if (viewer?.profile.onboarding_complete) redirect("/feed")
  if (viewer && !viewer.profile.onboarding_complete) redirect("/onboarding")

  return (
    <div className="min-h-full">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <BrandLockup href="/" shortOnMobile />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild><Link href="/login">Sign in</Link></Button>
            <Button size="sm" asChild><Link href="/signup">Join</Link></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-primary">For the Indian gaming industry</p>
            <h1 className="mt-2 max-w-xl text-4xl font-semibold tracking-tight">
              A professional network for the people who make, test, play, and perform games.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
              Studios find testers. Streamers and cosplay artists show their work. Gamers stay close to the industry. This is a desktop-first workspace, and it works on your phone.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" asChild><Link href="/signup">Create your profile</Link></Button>
              <Button size="lg" variant="outline" asChild><Link href="/opportunities">Browse opportunities</Link></Button>
            </div>
          </div>
          <SamplePost />
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ROLE_OPTIONS.map((role) => (
            <Link
              key={role.value}
              href="/signup"
              className="rounded-xl border bg-card p-4 transition-colors hover:border-primary"
            >
              <h2 className="text-sm font-semibold">{role.label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{role.blurb}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

function SamplePost() {
  return (
    <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 p-4 pb-0">
        <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">NG</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">Northwind Games</span>
          <span className="block truncate text-xs text-muted-foreground">Studio page · Example</span>
        </span>
      </div>
      <div className="px-4 pt-4">
        <h2 className="text-lg font-semibold">Playtest lead</h2>
        <p className="text-sm text-muted-foreground">Contract · Bengaluru</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          We are hiring a playtest lead for a mobile action game. You will run sessions, write notes, and work with the design team.
        </p>
      </div>
      <div className="mt-4 flex items-center gap-4 border-t px-4 py-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Heart className="size-4" /> 12</span>
        <span className="inline-flex items-center gap-1.5"><MessageCircle className="size-4" /> 3</span>
      </div>
    </article>
  )
}
