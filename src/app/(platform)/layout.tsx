import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Shell, ShellFallback } from "@/components/shell"
import { getViewer } from "@/lib/auth"
import { getSuggestions } from "@/server/queries"

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <Frame>{children}</Frame>
    </Suspense>
  )
}

async function Frame({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer()
  if (viewer && !viewer.profile.onboarding_complete) redirect("/onboarding")
  const suggestions = await getSuggestions()
  return (
    <Shell viewer={viewer} suggestions={suggestions}>
      {children}
    </Shell>
  )
}
