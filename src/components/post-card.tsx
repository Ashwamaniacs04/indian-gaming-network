import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PersonLink } from "@/components/person"
import { addComment, deleteComment, deletePost, toggleLike } from "@/server/actions/posts"
import { expressInterest } from "@/server/actions/social"
import { JOB_TYPE_LABELS, postTypeLabel, roleLabel } from "@/lib/constants"
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

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <PersonLink href={authorHref} name={authorName} path={authorPath} meta={meta} />
        <Badge variant="secondary">{postTypeLabel(post.post_type)}</Badge>
      </div>

      {post.post_type === "job" && post.job_title ? (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">{post.job_title}</h2>
          <p className="text-sm text-muted-foreground">
            {[post.job_type ? JOB_TYPE_LABELS[post.job_type] : null, post.job_location].filter(Boolean).join(" · ")}
          </p>
        </div>
      ) : null}

      {post.post_type === "collab" && post.collab_title ? (
        <div className="mt-4">
          <h2 className="text-lg font-semibold">{post.collab_title}</h2>
          <p className="text-sm text-muted-foreground">
            {[post.game_title, post.collab_looking_for.join(", ")].filter(Boolean).join(" · ")}
          </p>
        </div>
      ) : null}

      {post.body ? (
        <p className={`mt-3 text-sm leading-6 whitespace-pre-wrap ${detailed ? "" : "line-clamp-6"}`}>{post.body}</p>
      ) : null}

      {image ? (
        // User uploads are served from the project's Supabase storage host.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="mt-3 max-h-[420px] w-full rounded-lg object-cover" />
      ) : null}

      {thumb && post.youtube_url ? (
        detailed && youtubeId(post.youtube_url) ? (
          <iframe
            className="mt-3 aspect-video w-full rounded-lg"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId(post.youtube_url)}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <a href={post.youtube_url} target="_blank" rel="noreferrer" className="mt-3 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" className="aspect-video w-full rounded-lg object-cover" />
          </a>
        )
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {viewer ? (
          <form action={toggleLike}>
            <input type="hidden" name="post_id" value={post.id} />
            <Button type="submit" variant={post.liked_by_me ? "default" : "outline"} size="sm">
              {post.liked_by_me ? "Liked" : "Like"} · {post.like_count}
            </Button>
          </form>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Like · {post.like_count}</Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/post/${post.id}`}>Comments · {post.comment_count}</Link>
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
        <InterestBox postId={post.id} signedIn={Boolean(viewer)} />
      ) : null}
    </article>
  )
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
        {comments.length === 0 ? <p className="text-sm text-muted-foreground">No comments yet.</p> : null}
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
