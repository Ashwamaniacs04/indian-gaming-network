import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { safeNextPath } from "@/lib/format"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = safeNextPath(url.searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL("/login?error=link", url.origin))
    }
    if (next === "/login/update-password") {
      return NextResponse.redirect(new URL(next, url.origin))
    }
    const { data } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", userId)
        .maybeSingle()
      const complete = Boolean((profile as { onboarding_complete?: boolean } | null)?.onboarding_complete)
      if (!complete) {
        return NextResponse.redirect(new URL("/onboarding", url.origin))
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
