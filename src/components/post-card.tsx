import Link from "next/link"
import { Heart, MessageCircle, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PersonLink } from "@/components/person"
import { addComment, deleteComment, deletePost, toggleLike } from "@/server/actions/posts"
import { expressInterest } from "@/server/actions/social"
import { JOB_TYPE_LABELS, roleLabel } from "@/lib/constants"
import { formatWhen, publicStorageUrl } from "@/lib/format"
import type { CommentItem, PostCard as PostCardData, Viewer } from "@/lib/types"
import { youtubeId, youtubeThumbnail } from "@/lib/youtube"
import { ActionForm, AreaField, SubmitButton } from "@/components/form-kit"

export function PostCard({
  post,
  viewer,
  detailed = false,
  showInterest = false,
}: {
  post: PostCardData
  viewer: Viewer | null
  detailed?: boolean
  showInterest?: boolean
}) {
  const authorHref = post.page ? `/p/${post.page.slug}` : `/u/${post.author.username}`
  const authorName = post.page?.name ?? post.author.display_name
  const authorPath = post.page?.logo_path ?? post.author.avatar_path
  const meta = post.page
    ? `Page · ${formatWhen(post.created_at)}`
    : `${roleLabel(post.author.role)} · ${formatWhen(post.created_at)}`
  const image = publicStorageUrl("posts", post.image_path)
  const thumb = post.youtube_url ? youtubeThumbnail(post.youtube_url) : null
  const owned = viewer?.profile.username === post.author.username
  const video = youtubeCopy(post.body)

  return (
    <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="p-4 pb-0">
        <PersonLink href={authorHref} name={authorName} path={authorPath} meta={meta} />
      </div>

      {post.post_type === "image" ? (
        <>
          {image ? (
            detailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="mt-3 max-h-[420px] w-full object-cover" />
            ) : (
              <Link href={`/post/${post.id}`} className="mt-3 block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="max-h-[420px] w-full object-cover" />
              </Link>
            )
          ) : null}
          {post.body ? (
            <p className={`px-4 pt-3 text-sm leading-6 whitespace-pre-wrap ${detailed ? "" : "line-clamp-4"}`}>{post.body}</p>
          ) : null}
        </>
      ) : null}

      {post.post_type === "youtube" && post.youtube_url ? (
        <div>
          {detailed && youtubeId(post.youtube_url) ? (
            <iframe
              className="mt-3 aspect-video w-full"
              src={`https://www.youtube-nocookie.com/embed/${youtubeId(post.youtube_url)}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : thumb ? (
            <a href={post.youtube_url} target="_blank" rel="noreferrer" className="relative mt-3 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb} alt="" className="aspect-video w-full object-cover" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-12 place-items-center rounded-full bg-white text-primary shadow-sm">
                  <Play className="size-5 fill-current" />
                </span>
              </span>
            </a>
          ) : null}
          <div className="px-4 pt-3">
            <h2 className={`text-base font-semibold ${detailed ? "" : "line-clamp-2"}`}>{video.title}</h2>
            {video.note ? (
              <p className={`mt-1 text-sm leading-6 whitespace-pre-wrap text-muted-foreground ${detailed ? "" : "line-clamp-3"}`}>{video.note}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {post.post_type === "job" && post.job_title ? (
        <div className="px-4 pt-4">
          <h2 className="text-lg font-semibold">
            {detailed ? post.job_title : <Link href={`/post/${post.id}`} className="hover:underline">{post.job_title}</Link>}
          </h2>
          <p className="text-sm text-muted-foreground">
            {[post.job_type ? JOB_TYPE_LABELS[post.job_type] : null, post.job_location].filter(Boolean).join(" · ")}
          </p>
          {post.body ? (
            <p className={`mt-3 text-sm leading-6 whitespace-pre-wrap ${detailed ? "" : "line-clamp-3"}`}>{post.body}</p>
          ) : null}
        </div>
      ) : null}

      {post.post_type === "collab" && post.collab_title ? (
        <div className="px-4 pt-4">
          <h2 className="text-lg font-semibold">
            {detailed ? post.collab_title : <Link href={`/post/${post.id}`} className="hover:underline">{post.collab_title}</Link>}
          </h2>
          {post.game_title ? <p className="text-sm text-muted-foreground">{post.game_title}</p> : null}
          {post.collab_looking_for.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.collab_looking_for.map((role) => (
                <Badge key={role} variant="secondary">{role}</Badge>
              ))}
            </div>
          ) : null}
          {post.body ? (
            <p className={`mt-3 text-sm leading-6 whitespace-pre-wrap ${detailed ? "" : "line-clamp-3"}`}>{post.body}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t px-4 py-2">
        {viewer ? (
          <form action={toggleLike}>
            <input type="hidden" name="post_id" value={post.id} />
            <Button type="submit" variant="ghost" size="sm" className={post.liked_by_me ? "text-primary" : ""}>
              <Heart className={`size-4 ${post.liked_by_me ? "fill-current" : ""}`} />
              {post.liked_by_me ? "Liked" : "Like"}
              <span className="text-muted-foreground">{post.like_count}</span>
            </Button>
          </form>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">
              <Heart className="size-4" />
              Like
              <span className="text-muted-foreground">{post.like_count}</span>
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/post/${post.id}`}>
            <MessageCircle className="size-4" />
            Comment
            <span className="text-muted-foreground">{post.comment_count}</span>
          </Link>
        </Button>
        {owned && detailed ? (
          <form action={deletePost}>
            <input type="hidden" name="id" value={post.id} />
            <Button type="submit" variant="ghost" size="sm">
              Delete
            </Button>
          </form>
        ) : null}
      </div>

      {(detailed || showInterest) && !owned && (post.post_type === "job" || post.post_type === "collab") ? (
        <div className="px-4 pb-4">
          <InterestBox postId={post.id} signedIn={Boolean(viewer)} />
        </div>
      ) : null}
    </article>
  )
}

function youtubeCopy(body: string) {
  const trimmed = body.trim()
  if (!trimmed) return { title: "YouTube video", note: "" }
  const newline = trimmed.indexOf("\n")
  if (newline === -1) return { title: trimmed, note: "" }
  return {
    title: trimmed.slice(0, newline).trim() || "YouTube video",
    note: trimmed.slice(newline + 1).trim(),
  }
}

function InterestBox({ postId, signedIn }: { postId: string; signedIn: boolean }) {
  if (!signedIn) {
    return (
      <p className="mt-4 text-sm">
        <Link href="/login" className="font-medium text-primary">Sign in</Link> to express interest.
      </p>
    )
  }
  return (
    <ActionForm action={expressInterest} className="mt-4 space-y-2 border-t pt-4">
      <input type="hidden" name="post_id" value={postId} />
      <AreaField name="message" placeholder="Say why you're a fit" rows={3} />
      <SubmitButton pendingLabel="Sending…">Express interest</SubmitButton>
    </ActionForm>
  )
}

export function CommentList({
  comments,
  postId,
  viewer,
}: {
  comments: CommentItem[]
  postId: string
  viewer: Viewer | null
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Comments</h2>
      <div className="mt-3 space-y-4">
        {comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet. Be the first to reply.</p> : null}
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="min-w-0 flex-1">
              <PersonLink
                href={`/u/${comment.author.username}`}
                name={comment.author.display_name}
                path={comment.author.avatar_path}
                meta={formatWhen(comment.created_at)}
              />
              <p className="mt-2 text-sm whitespace-pre-wrap">{comment.body}</p>
            </div>
            {viewer?.id === comment.author_id ? (
              <form action={deleteComment}>
                <input type="hidden" name="id" value={comment.id} />
                <input type="hidden" name="post_id" value={postId} />
                <Button type="submit" variant="ghost" size="sm">Delete</Button>
              </form>
            ) : null}
          </div>
        ))}
      </div>
      {viewer ? (
        <ActionForm action={addComment} className="mt-4 space-y-2">
          <input type="hidden" name="post_id" value={postId} />
          <AreaField name="body" placeholder="Write a comment" rows={3} />
          <SubmitButton pendingLabel="Posting…">Comment</SubmitButton>
        </ActionForm>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary">Sign in</Link> to comment.
        </p>
      )}
    </section>
  )
}
