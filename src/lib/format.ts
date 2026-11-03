export function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function formatWhen(value: string) {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return value
  const minutes = Math.round((Date.now() - then) / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export function formatMonth(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(date)
}

export function locationLabel(city: string | null, state: string | null) {
  return [city, state].filter(Boolean).join(", ")
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const letters = parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
  return letters || "?"
}

export function splitList(value: string, limit = 20) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, limit)
}

export function publicStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
  if (!base) return null
  return `${base}/storage/v1/object/public/${bucket}/${path}`
}

export function friendlyDbError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes("username")) return "That username is taken."
  if (lower.includes("slug")) return "That page address is taken."
  if (lower.includes("pages_owner")) return "This account already has a page."
  if (lower.includes("interests_one")) return "You already expressed interest."
  if (lower.includes("cannot follow your own")) return "You cannot follow your own page."
  if (lower.includes("not open")) return "This playtest is closed."
  if (lower.includes("only allowed on job")) return "You can only apply to jobs and collabs."
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "You do not have permission to do that."
  }
  return "Something went wrong. Please try again."
}

export function safeNextPath(value: unknown) {
  if (typeof value !== "string") return "/feed"
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/feed"
  return value
}

export function textValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}
