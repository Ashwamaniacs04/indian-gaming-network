import { Suspense } from "react"
import { notFound } from "next/navigation"
import { ProfileView } from "@/components/profile-view"
import { getViewer } from "@/lib/auth"
import { getExperience, getPageByOwner, getPortfolio, getPostsByAuthor, getProfileByUsername } from "@/server/queries"

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return { title: `@${username}` }
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Profile params={params} />
    </Suspense>
  )
}

async function Profile({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const profile = await getProfileByUsername(username)
  if (!profile || !profile.onboarding_complete) notFound()
  const [page, portfolio, experience, posts, viewer] = await Promise.all([
    getPageByOwner(profile.id),
    getPortfolio(profile.id),
    getExperience(profile.id),
    getPostsByAuthor(profile.id),
    getViewer(),
  ])
  return <ProfileView profile={profile} page={page} portfolio={portfolio} experience={experience} posts={posts} viewer={viewer} />
}
