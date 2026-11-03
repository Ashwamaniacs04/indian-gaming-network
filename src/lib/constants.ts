import type { JobType, PostType, Role } from "@/lib/types"

export const ROLE_OPTIONS: { value: Role; label: string; blurb: string }[] = [
  {
    value: "gamer",
    label: "Gamer",
    blurb: "Play, share clips, and find people in the industry.",
  },
  {
    value: "tester",
    label: "Tester",
    blurb: "Playtesters and QA who want studio work.",
  },
  {
    value: "studio",
    label: "Studio",
    blurb: "Teams hiring testers, creators, and collaborators.",
  },
  {
    value: "streamer",
    label: "Streamer",
    blurb: "Creators looking for communities, brands, and collabs.",
  },
  {
    value: "cosplay_artist",
    label: "Cosplay Artist",
    blurb: "Artists showcasing work and finding opportunities.",
  },
]

export const POST_TYPE_OPTIONS: { value: PostType; label: string; hint: string }[] = [
  { value: "image", label: "Image", hint: "A picture with a caption" },
  { value: "youtube", label: "YouTube", hint: "A YouTube link" },
  { value: "job", label: "Job vacancy", hint: "A role you are hiring for" },
  { value: "collab", label: "Collab", hint: "A collaboration call" },
]

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: "Full-time",
  contract: "Contract",
  freelance: "Freelance",
  internship: "Internship",
}

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const

export const PLATFORMS = [
  "PC",
  "PlayStation",
  "Xbox",
  "Nintendo Switch",
  "Mobile",
  "VR",
] as const

export const COLLAB_ROLES = [
  "Gamer",
  "Tester",
  "Streamer",
  "Cosplay Artist",
  "Artist",
  "Writer",
  "Composer",
  "Community",
] as const

export const AVAILABILITY_OPTIONS = [
  "Open to work",
  "Open to collabs",
  "Limited availability",
  "Not available",
] as const

export function roleLabel(role: Role) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role
}

export function postTypeLabel(type: PostType) {
  return POST_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type
}
