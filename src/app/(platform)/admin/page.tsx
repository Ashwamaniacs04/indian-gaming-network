import Link from "next/link"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { roleLabel } from "@/lib/constants"
import { formatDate } from "@/lib/format"
import { requireUser } from "@/lib/auth"
import { adminDeleteLogin } from "@/server/actions/platform"
import { getAdminAccounts, getReports } from "@/server/platform-data"
import type { Role } from "@/lib/types"

export const metadata = { title: "Admin" }

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-card" />}>
      <Admin />
    </Suspense>
  )
}

async function Admin() {
  const viewer = await requireUser()
  if (!viewer.isAdmin) {
    return (
      <section className="rounded-xl border bg-card p-5">
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page is only for the site admin.</p>
      </section>
    )
  }
  const [accounts, reports] = await Promise.all([getAdminAccounts(), getReports()])
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Accounts</h2>
        {accounts.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Accounts appear here after the admin SQL has been run.</p> : (
          <ul className="mt-3 divide-y">
            {accounts.map((account) => (
              <li key={account.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="min-w-0">
                  <Link href={`/u/${account.username}`} className="block text-sm font-medium text-primary">{account.display_name}</Link>
                  <span className="block text-xs text-muted-foreground">{account.email} · {roleLabel(account.role as Role)} · {account.created_at ? formatDate(account.created_at) : ""}</span>
                </span>
                <span className="flex gap-2">
                  <Button size="sm" variant="outline" asChild><Link href={`/admin/${account.id}`}>Edit</Link></Button>
                  {account.id !== viewer.id ? (
                    <form action={adminDeleteLogin}>
                      <input type="hidden" name="target_id" value={account.id} />
                      <Button type="submit" size="sm" variant="outline">Remove login</Button>
                    </form>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Reports</h2>
        {reports.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No reports yet.</p> : (
          <ul className="mt-3 space-y-3">
            {reports.map((report) => (
              <li key={report.id} className="rounded-lg border p-3 text-sm">
                <p>{report.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {report.target_type} · {report.reporter_name} · {report.created_at ? formatDate(report.created_at) : ""}
                  {report.target_type === "profile" ? null : <Link className="ml-2 text-primary" href={`/post/${report.target_id}`}>Open</Link>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
