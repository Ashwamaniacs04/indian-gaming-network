import { cn } from "@/lib/utils"

export function VerifiedMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      role="img"
      aria-label="Verified"
      className={cn("size-4 shrink-0 text-[#8b919a]", className)}
    >
      <title>Verified</title>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8.2 7.1 10.2 11 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function VerifiedName({
  name,
  verified = false,
  className,
}: {
  name: string
  verified?: boolean
  className?: string
}) {
  return (
    <span className={cn("inline-flex max-w-full min-w-0 items-center gap-1", className)}>
      <span className="truncate">{name}</span>
      {verified ? <VerifiedMark /> : null}
    </span>
  )
}
