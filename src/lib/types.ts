export const ROLES = [
  "gamer",
  "tester",
  "studio",
  "streamer",
  "cosplay_artist",
] as const

export type Role = (typeof ROLES)[number]

export const POST_TYPES = ["image", "youtube", "job", "collab"] as const
export type PostType = (typeof POST_TYPES)[number]

export const JOB_TYPES = ["full_time", "contract", "freelance", "internship"] as const
export type JobType = (typeof JOB_TYPES)[number]

export type Socials = {
  youtube?: string
  twitch?: string
  instagram?: string
  discord?: string
}

export type RoleDetails = {
  platforms?: string[]
  favorite_games?: string[]
  games_tested?: string[]
  years_experience?: number | null
  schedule?: string
  avg_viewers?: number | null
  conventions?: string[]
  characters?: string[]
}

export type Profile = {
  id: string
  username: string
  display_name: string
  role: Role
  headline: string | null
  about: string | null
  city: string | null
  state: string | null
  avatar_path: string | null
  banner_path: string | null
  skills: string[]
  website: string | null
  contact_email: string | null
  availability: string | null
  socials: Socials
  role_details: RoleDetails
  onboarding_complete: boolean
}

export type StudioPage = {
  id: string
  owner_id: string
  slug: string
  name: string
  page_type: string
  headline: string | null
  about: string | null
  city: string | null
  state: string | null
  logo_path: string | null
  banner_path: string | null
  website: string | null
  contact_email: string | null
  games: string[]
  specialties: string[]
}

export type ViewerPage = {
  id: string
  slug: string
  name: string
  logo_path: string | null
}

export type Viewer = {
  id: string
  profile: Profile
  page: ViewerPage | null
  unread: number
}

export type PostCard = {
  id: string
  post_type: PostType
  body: string
  image_path: string | null
  youtube_url: string | null
  job_title: string | null
  job_location: string | null
  job_type: JobType | null
  collab_title: string | null
  collab_looking_for: string[]
  game_title: string | null
  created_at: string
  author: {
    username: string
    display_name: string
    avatar_path: string | null
    headline: string | null
    role: Role
  }
  page: {
    slug: string
    name: string
    logo_path: string | null
  } | null
  like_count: number
  comment_count: number
  liked_by_me: boolean
}

export type CommentItem = {
  id: string
  body: string
  created_at: string
  author_id: string
  author: {
    username: string
    display_name: string
    avatar_path: string | null
  }
}

export type PortfolioItem = {
  id: string
  title: string
  caption: string | null
  media_path: string | null
  external_url: string | null
}

export type ExperienceItem = {
  id: string
  title: string
  organization: string | null
  game_title: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
}

export type PlaytestCard = {
  id: string
  title: string
  game_title: string
  description: string
  platforms: string[]
  location_type: "remote" | "onsite" | "hybrid"
  city: string | null
  state: string | null
  compensation: string | null
  slots: number | null
  deadline: string | null
  status: "open" | "closed"
  created_at: string
  page: {
    slug: string
    name: string
    logo_path: string | null
  }
}

export type InterestInboxItem = {
  id: string
  message: string
  status: "pending" | "accepted" | "declined"
  created_at: string
  kind: string
  target_title: string | null
  applicant_name: string
  applicant_username: string
  applicant_avatar_path: string | null
}

export type NotificationItem = {
  id: string
  type: "comment" | "interest" | "page_follow"
  entity_id: string
  read_at: string | null
  created_at: string
  actor: {
    username: string
    display_name: string
  } | null
}

export type ActionState = {
  error?: string
  success?: string
} | null

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value)
}
