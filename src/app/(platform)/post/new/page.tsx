import { Suspense } from "react"
import { Composer } from "@/components/composer"
import { requireUser } from "@/lib/auth"

export const metadata = { title: "New post" }

export default function NewPostPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <NewPost />
    </Suspense>
  )
}

async function NewPost() {
  const viewer = await requireUser()
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">New post</h1>
      <Composer
        pageName={viewer.page?.name ?? null}
        authorName={viewer.profile.display_name}
        avatarPath={viewer.profile.avatar_path}
        expanded
      />
    </div>
  )
}
