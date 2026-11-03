import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
      <p className="text-sm font-semibold text-primary">Indian Gaming Network</p>
      <h1 className="mt-2 text-2xl font-semibold">That page is not here</h1>
      <p className="mt-2 text-sm text-muted-foreground">The profile, page, or post may have been removed.</p>
      <Link href="/" className="mt-4 text-sm font-medium text-primary">Back to the start</Link>
    </main>
  )
}
