import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials, publicStorageUrl } from "@/lib/format"
import { cn } from "@/lib/utils"

export function UserAvatar({
  name,
  path,
  bucket = "avatars",
  className,
}: {
  name: string
  path: string | null
  bucket?: string
  className?: string
}) {
  const url = publicStorageUrl(bucket, path)
  return (
    <Avatar className={cn("size-10", className)}>
      {url ? <AvatarImage src={url} alt="" /> : null}
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

export function SetupNotice() {
  return (
    <div className="rounded-xl border bg-card p-5 text-sm">
      <h2 className="font-semibold">Connect Supabase to use accounts</h2>
      <p className="mt-2 text-muted-foreground">
        Copy <code>.env.example</code> to <code>.env.local</code>, add your project URL and publishable key, then run the SQL migration in <code>supabase/migrations/0001_init.sql</code>.
      </p>
    </div>
  )
}

export function PersonLink({
  href,
  name,
  path,
  meta,
}: {
  href: string
  name: string
  path: string | null
  meta?: string | null
}) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-3">
      <UserAvatar name={name} path={path} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name}</span>
        {meta ? <span className="block truncate text-xs text-muted-foreground">{meta}</span> : null}
      </span>
    </Link>
  )
}
