import type { Profile } from "@/lib/types"
import { roleLabel } from "@/lib/constants"

export function profileCardGap(profile: Profile, hasPage: boolean) {
  const details = profile.role_details
  const title = `Finish your ${roleLabel(profile.role).toLowerCase()} card`
  if (profile.role === "tester") {
    if (!details.years_experience || !details.platforms?.length || !details.games_tested?.length) {
      return {
        title,
        body: "Add the years, platforms, and games you test. Search stays quiet until those details exist.",
        href: "/profile/edit",
      }
    }
  }
  if (profile.role === "gamer") {
    if (!details.platforms?.length || !details.favorite_games?.length) {
      return {
        title,
        body: "Add the platforms you play and the games you list. People find you from those details.",
        href: "/profile/edit",
      }
    }
  }
  if (profile.role === "streamer") {
    if (!profile.socials.youtube && !profile.socials.twitch) {
      return {
        title,
        body: "Add your YouTube or Twitch channel so studios and players can find the stream.",
        href: "/profile/edit",
      }
    }
  }
  if (profile.role === "cosplay_artist") {
    if (!details.characters?.length) {
      return {
        title,
        body: "Add the characters you make so bookings and collabs can find the right artist.",
        href: "/profile/edit",
      }
    }
  }
  if (profile.role === "studio" && !hasPage) {
    return {
      title: "Finish your studio page",
      body: "A studio account needs its page before trailers, playtests, and jobs can be posted.",
      href: "/page/edit",
    }
  }
  return null
}
