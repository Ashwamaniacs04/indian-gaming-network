import { Suspense } from "react"
import { notFound } from "next/navigation"
import { CommentList, PostCard } from "@/components/post-card"
import { getViewer } from "@/lib/auth"
import { getComments, getPost } from "@/server/queries"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Post ${id.slice(0, 8)}` }
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <PostDetail params={params} />
    </Suspense>
  )
}

async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [post, comments, viewer] = await Promise.all([getPost(id), getComments(id), getViewer()])
  if (!post) notFound()
  return (
    <div className="space-y-4">
      <PostCard post={post} viewer={viewer} detailed />
      <CommentList comments={comments} postId={post.id} viewer={viewer} />
    </div>
  )
}
