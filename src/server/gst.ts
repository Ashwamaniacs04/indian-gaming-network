import { normalizeGstin } from "@/lib/verification"

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function textAt(record: Record<string, unknown> | null, keys: string[]) {
  if (!record) return ""
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

export async function lookupGstin(gstin: string): Promise<{ legalName: string } | { error: string }> {
  const url = process.env.GST_API_URL
  const key = process.env.GST_API_KEY
  if (!url || !key) return { error: "Verification is not set up yet." }

  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ gstin: normalizeGstin(gstin) }),
      cache: "no-store",
    })
  } catch {
    return { error: "GST could not be checked. Try again." }
  }

  const payload = asRecord(await response.json().catch(() => null))
  const data = asRecord(payload?.data) ?? payload
  if (!response.ok || !data) return { error: "GST could not be checked. Try again." }

  const legalName = textAt(data, ["legal_name", "legalName", "lgnm", "trade_name", "tradeName", "tradeNam"])
  const status = textAt(data, ["status", "sts", "registration_status", "registrationStatus"]).toLowerCase()
  const active = status === "active" || status === "act"
  if (!active || legalName.length < 2) {
    return { error: status && !active ? "This GST number is not active." : "This GST number could not be confirmed." }
  }
  return { legalName: legalName.replace(/\s+/g, " ").slice(0, 160) }
}
