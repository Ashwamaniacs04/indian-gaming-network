"use client"

import { useActionState, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ActionState } from "@/lib/types"

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  children: ReactNode
  className?: string
}) {
  const [state, formAction] = useActionState(action, null)
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-primary">{state.success}</p> : null}
    </form>
  )
}

export function SubmitButton({
  children,
  pendingLabel = "Saving…",
  variant = "default",
  size = "default",
}: {
  children: ReactNode
  pendingLabel?: string
  variant?: "default" | "outline" | "secondary" | "ghost"
  size?: "default" | "sm" | "lg"
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} variant={variant} size={size}>
      {pending ? pendingLabel : children}
    </Button>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

export function TextField(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} />
}

export function AreaField(props: React.ComponentProps<typeof Textarea>) {
  return <Textarea {...props} />
}

export function NativeSelect(props: React.ComponentProps<"select">) {
  return (
    <select
      {...props}
      className={`h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 ${props.className ?? ""}`}
    />
  )
}
