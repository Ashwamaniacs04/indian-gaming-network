import Link from "next/link"
import { Suspense } from "react"
import { redirect } from "next/navigation"
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
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="text-sm font-semibold text-primary">Indian Gaming Network</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild><Link href="/login">Sign in</Link></Button>
            <Button size="sm" asChild><Link href="/signup">Join</Link></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm font-medium text-primary">For the Indian gaming industry</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight">
          A professional network for the people who make, test, play, and perform games.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Studios find testers. Streamers and cosplay artists show their work. Gamers stay close to the industry. This is a desktop-first workspace, and it works on your phone.
        </p>
        <div className="mt-6 flex gap-3">
          <Button size="lg" asChild><Link href="/signup">Create your profile</Link></Button>
          <Button size="lg" variant="outline" asChild><Link href="/opportunities">Browse opportunities</Link></Button>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ROLE_OPTIONS.map((role) => (
            <article key={role.value} className="rounded-xl border bg-card p-4">
              <h2 className="text-sm font-semibold">{role.label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{role.blurb}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
