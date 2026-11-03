import Link from "next/link"
import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md bg-primary text-xs font-semibold tracking-tight text-primary-foreground",
        className,
      )}
    >
      IG
    </span>
  )
}

export function BrandLockup({
  href,
  shortOnMobile = false,
}: {
  href: string
  shortOnMobile?: boolean
}) {
  return (
    <Link href={href} className="flex min-w-0 items-center gap-2 text-foreground">
      <BrandMark />
      <span className="truncate text-sm font-semibold">
        {shortOnMobile ? (
          <>
            <span className="sm:hidden">IGN</span>
            <span className="hidden sm:inline">Indian Gaming Network</span>
          </>
        ) : (
          "Indian Gaming Network"
        )}
      </span>
    </Link>
  )
}
