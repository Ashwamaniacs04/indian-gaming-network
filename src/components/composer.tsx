"use client"

import { useState } from "react"
import { createPost } from "@/server/actions/posts"
import { COLLAB_ROLES, JOB_TYPE_LABELS, POST_TYPE_OPTIONS } from "@/lib/constants"
import type { JobType, PostType } from "@/lib/types"
import { ActionForm, AreaField, Field, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"

export function Composer({ pageName }: { pageName: string | null }) {
  const [type, setType] = useState<PostType | "">("")

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold">Create a post</h2>
      <p className="mt-1 text-xs text-muted-foreground">Choose a post type. A post cannot be published without one.</p>
      <ActionForm action={createPost} className="mt-4 space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {POST_TYPE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${type === option.value ? "border-primary bg-primary/5" : "bg-background"}`}
            >
              <input
                className="mr-2"
                type="radio"
                name="post_type"
                value={option.value}
                required
                checked={type === option.value}
                onChange={() => setType(option.value)}
              />
              <span className="font-medium">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
            </label>
          ))}
        </div>

        {type === "job" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Job title"><TextField name="job_title" required /></Field>
            <Field label="Job type">
              <NativeSelect name="job_type" defaultValue="full_time" required>
                {(Object.keys(JOB_TYPE_LABELS) as JobType[]).map((jobType) => (
                  <option key={jobType} value={jobType}>{JOB_TYPE_LABELS[jobType]}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Location" hint="City, remote, or hybrid">
              <TextField name="job_location" />
            </Field>
          </div>
        ) : null}

        {type === "collab" ? (
          <div className="space-y-3">
            <Field label="Collab title"><TextField name="collab_title" required /></Field>
            <Field label="Game"><TextField name="game_title" /></Field>
            <fieldset>
              <legend className="text-sm font-medium">Looking for</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLLAB_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                    <input type="checkbox" name="collab_looking_for" value={role} />
                    {role}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {type === "youtube" ? (
          <Field label="YouTube link">
            <TextField name="youtube_url" type="url" placeholder="https://www.youtube.com/watch?v=..." required />
          </Field>
        ) : null}

        {type === "image" ? (
          <Field label="Picture">
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required className="block w-full text-sm" />
          </Field>
        ) : null}

        {type ? (
          <Field label={type === "job" || type === "collab" ? "Description" : "Caption"}>
            <AreaField name="body" rows={4} placeholder="Write something the industry can act on" />
          </Field>
        ) : null}

        {pageName && type ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="as_page" value="1" />
            Post as {pageName}
          </label>
        ) : null}

        <SubmitButton pendingLabel="Publishing…" size="lg">Publish</SubmitButton>
      </ActionForm>
    </section>
  )
}
