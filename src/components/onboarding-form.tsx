"use client"

import { useState } from "react"
import { completeOnboarding } from "@/server/actions/profile"
import { INDIAN_STATES, ROLE_OPTIONS } from "@/lib/constants"
import type { Role } from "@/lib/types"
import { ActionForm, AreaField, Field, NativeSelect, SubmitButton, TextField } from "@/components/form-kit"

export function OnboardingForm({
  defaultRole,
  defaultName,
}: {
  defaultRole: Role
  defaultName: string
}) {
  const [role, setRole] = useState<Role>(defaultRole)

  return (
    <ActionForm action={completeOnboarding} className="space-y-4">
      <Field label="I am joining as">
        <NativeSelect name="role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Username" hint="This is your profile address. Letters, numbers, and underscores.">
        <TextField name="username" required minLength={3} maxLength={20} placeholder="riya_qa" />
      </Field>
      <Field label="Headline">
        <TextField name="headline" required maxLength={140} defaultValue={defaultName ? `${defaultName} · ${ROLE_OPTIONS.find((item) => item.value === role)?.label}` : ""} placeholder="QA tester for mobile action games" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="State">
          <NativeSelect name="state" defaultValue="" required>
            <option value="" disabled>Choose a state</option>
            {INDIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
          </NativeSelect>
        </Field>
        <Field label="City">
          <TextField name="city" required placeholder="Bengaluru" />
        </Field>
      </div>
      <Field label="About">
        <AreaField name="about" rows={4} placeholder="What you do in games, and what you're looking for." />
      </Field>
      {role === "studio" ? (
        <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
          <p className="text-sm font-medium">Your studio page</p>
          <p className="text-xs text-muted-foreground">People follow the page, not your personal profile. A studio account needs one page.</p>
          <Field label="Studio name"><TextField name="page_name" required /></Field>
          <Field label="Page address" hint="indian-gaming-network.app/p/your-studio">
            <TextField name="page_slug" required placeholder="pixel-forge" />
          </Field>
          <Field label="About the studio"><AreaField name="page_about" rows={3} /></Field>
        </div>
      ) : null}
      <SubmitButton pendingLabel="Saving…" size="lg">Finish and open the feed</SubmitButton>
    </ActionForm>
  )
}
