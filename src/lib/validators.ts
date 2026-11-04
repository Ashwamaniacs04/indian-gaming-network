import { z } from "zod"
import { COLLAB_ROLES, INDIAN_STATES, PLATFORMS } from "@/lib/constants"
import { JOB_TYPES, POST_TYPES, ROLES } from "@/lib/types"
import { canonicalYoutubeUrl } from "@/lib/youtube"

export const roleSchema = z.enum(ROLES)
export const postTypeSchema = z.enum(POST_TYPES)

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "Use 3–20 letters, numbers, or underscores.")

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{3,40}$/, "Use 3–40 letters, numbers, or hyphens.")

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null))

export const signupSchema = z.object({
  display_name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters.").max(72),
  role: roleSchema,
})

export const loginSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
})

export const passwordResetRequestSchema = z.object({
  email: z.email("Enter a valid email."),
})

export const newPasswordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters.").max(72),
})

export const onboardingSchema = z
  .object({
    role: roleSchema,
    username: usernameSchema,
    headline: z.string().trim().min(2, "Add a short headline.").max(140),
    state: z.enum(INDIAN_STATES, { error: "Choose a state." }),
    city: z.string().trim().min(2, "Enter your city.").max(80),
    about: optionalText(4000),
    page_name: z.string().trim().max(80).optional().default(""),
    page_slug: z.string().trim().optional().default(""),
    page_about: optionalText(4000),
  })
  .superRefine((value, ctx) => {
    if (value.role !== "studio") return
    if (value.page_name.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["page_name"], message: "Enter your studio name." })
    }
    const slug = slugSchema.safeParse(value.page_slug)
    if (!slug.success) {
      ctx.addIssue({
        code: "custom",
        path: ["page_slug"],
        message: slug.error.issues[0]?.message ?? "Enter a page address.",
      })
    }
  })

export const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(80),
  headline: z.string().trim().max(140).optional().default(""),
  about: z.string().trim().max(4000).optional().default(""),
  state: z.string().trim().max(80).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  website: z.string().trim().max(200).optional().default(""),
  contact_email: z.string().trim().max(200).optional().default(""),
  availability: z.string().trim().max(80).optional().default(""),
  skills: z.string().trim().max(400).optional().default(""),
  youtube: z.string().trim().max(200).optional().default(""),
  twitch: z.string().trim().max(200).optional().default(""),
  instagram: z.string().trim().max(200).optional().default(""),
  discord: z.string().trim().max(80).optional().default(""),
  platforms: z.array(z.enum(PLATFORMS)).default([]),
  favorite_games: z.string().trim().max(300).optional().default(""),
  games_tested: z.string().trim().max(300).optional().default(""),
  years_experience: z.string().trim().optional().default(""),
  schedule: z.string().trim().max(200).optional().default(""),
  avg_viewers: z.string().trim().optional().default(""),
  conventions: z.string().trim().max(300).optional().default(""),
  characters: z.string().trim().max(300).optional().default(""),
})

export const pageSchema = z.object({
  name: z.string().trim().min(2, "Enter a page name.").max(80),
  slug: slugSchema,
  headline: z.string().trim().max(140).optional().default(""),
  about: z.string().trim().max(4000).optional().default(""),
  state: z.string().trim().max(80).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
  website: z.string().trim().max(200).optional().default(""),
  contact_email: z.string().trim().max(200).optional().default(""),
  games: z.string().trim().max(300).optional().default(""),
  specialties: z.string().trim().max(300).optional().default(""),
})

export const postSchema = z
  .object({
    post_type: postTypeSchema,
    body: z.string().trim().max(4000).optional().default(""),
    youtube_url: z.string().trim().optional().default(""),
    job_title: z.string().trim().max(120).optional().default(""),
    job_location: z.string().trim().max(120).optional().default(""),
    job_type: z.enum(JOB_TYPES).optional(),
    collab_title: z.string().trim().max(120).optional().default(""),
    collab_looking_for: z.array(z.enum(COLLAB_ROLES)).default([]),
    game_title: z.string().trim().max(120).optional().default(""),
    as_page: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.post_type === "youtube") {
      if (!canonicalYoutubeUrl(value.youtube_url)) {
        ctx.addIssue({ code: "custom", path: ["youtube_url"], message: "Enter a valid YouTube link." })
      }
      if (value.body.length < 1) {
        ctx.addIssue({ code: "custom", path: ["body"], message: "Add a short note with the video." })
      }
    }
    if (value.post_type === "job") {
      if (value.job_title.length < 2) {
        ctx.addIssue({ code: "custom", path: ["job_title"], message: "Enter the job title." })
      }
      if (!value.job_type) {
        ctx.addIssue({ code: "custom", path: ["job_type"], message: "Choose a job type." })
      }
      if (value.body.length < 10) {
        ctx.addIssue({ code: "custom", path: ["body"], message: "Describe the role in at least a sentence." })
      }
    }
    if (value.post_type === "collab") {
      if (value.collab_title.length < 2) {
        ctx.addIssue({ code: "custom", path: ["collab_title"], message: "Enter a collab title." })
      }
      if (value.collab_looking_for.length < 1) {
        ctx.addIssue({ code: "custom", path: ["collab_looking_for"], message: "Choose who you want to work with." })
      }
      if (value.body.length < 10) {
        ctx.addIssue({ code: "custom", path: ["body"], message: "Describe the collab." })
      }
    }
  })

export const playtestSchema = z.object({
  title: z.string().trim().min(3, "Enter a title.").max(120),
  game_title: z.string().trim().min(1, "Enter the game.").max(120),
  description: z.string().trim().min(10, "Describe the playtest.").max(4000),
  platforms: z.array(z.enum(PLATFORMS)).min(1, "Choose at least one platform."),
  location_type: z.enum(["remote", "onsite", "hybrid"]),
  city: z.string().trim().max(80).optional().default(""),
  state: z.string().trim().max(80).optional().default(""),
  compensation: z.string().trim().max(160).optional().default(""),
  slots: z.string().trim().optional().default(""),
  deadline: z.string().trim().optional().default(""),
})

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment.").max(2000),
  post_id: z.uuid(),
})

export const portfolioSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(120),
  caption: z.string().trim().max(300).optional().default(""),
  external_url: z.string().trim().max(300).optional().default(""),
})

export const experienceSchema = z.object({
  title: z.string().trim().min(1, "Add a title.").max(120),
  organization: z.string().trim().max(120).optional().default(""),
  game_title: z.string().trim().max(120).optional().default(""),
  start_date: z.string().trim().optional().default(""),
  end_date: z.string().trim().optional().default(""),
  description: z.string().trim().max(1000).optional().default(""),
})

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again."
}
