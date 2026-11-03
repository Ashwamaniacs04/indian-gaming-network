import { Suspense } from "react"
import { redirect } from "next/navigation"
import { OnboardingForm } from "@/components/onboarding-form"
import { requireUser } from "@/lib/auth"

export const metadata = { title: "Set up your profile" }

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm">Loading…</div>}>
      <Onboarding />
    </Suspense>
  )
}

async function Onboarding() {
  const viewer = await requireUser()
  if (viewer.profile.onboarding_complete) redirect("/feed")

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="text-sm font-semibold text-primary">Indian Gaming Network</p>
      <h1 className="mt-2 text-2xl font-semibold">Set up your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A few details so studios, testers, and creators can find you.
      </p>
      <div className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <OnboardingForm defaultRole={viewer.profile.role} defaultName={viewer.profile.display_name} />
      </div>
    </main>
  )
}
