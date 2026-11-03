const ID = /^[\w-]{11}$/

export function youtubeId(input: string): string | null {
  try {
    const url = new URL(input.trim())
    const host = url.hostname.replace(/^www\./, "")
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0]
      return id && ID.test(id) ? id : null
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v")
        return id && ID.test(id) ? id : null
      }
      const parts = url.pathname.split("/").filter(Boolean)
      if (
        (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") &&
        parts[1] &&
        ID.test(parts[1])
      ) {
        return parts[1]
      }
    }
  } catch {
    return null
  }
  return null
}

export function canonicalYoutubeUrl(input: string) {
  const id = youtubeId(input)
  return id ? `https://www.youtube.com/watch?v=${id}` : null
}

export function youtubeThumbnail(input: string) {
  const id = youtubeId(input)
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
}
