import Link from "next/link"
import { BrandLockup } from "@/components/brand"
import { ThemeSwitch } from "@/components/theme-switch"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
      <div className="flex items-center justify-between gap-3">
        <BrandLockup href="/" />
        <ThemeSwitch />
      </div>
      <h1 className="mt-2 text-2xl font-semibold">That page is not here</h1>
      <p className="mt-2 text-sm text-muted-foreground">The profile, page, or post may have been removed.</p>
      <Link href="/" className="mt-4 text-sm font-medium text-primary">Back to the start</Link>
    </main>
  )
}
