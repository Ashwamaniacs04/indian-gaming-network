import { createHmac } from "crypto"
import {
  codeChallenge,
  digilockerBase,
  type IdDocumentType,
  last4FromDocument,
  lockerDoctype,
} from "@/lib/verification"

type IssuedFile = { doctype?: string; uri?: string; name?: string }

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function readName(value: unknown): string | null {
  const record = asRecord(value)
  if (!record) return null
  const nested = asRecord(record.poi) ?? asRecord(record.certificate) ?? record
  const candidates = [nested.name, nested.full_name, nested.fullName, record.name, record.full_name]
  const found = candidates.find((item): item is string => typeof item === "string" && item.trim().length > 1)
  return found ? found.trim().replace(/\s+/g, " ").slice(0, 120) : null
}

function issuedFiles(value: unknown): IssuedFile[] {
  const record = asRecord(value)
  const list = Array.isArray(value) ? value : record?.items ?? record?.files ?? record?.documents
  if (!Array.isArray(list)) return []
  return list.flatMap((item) => {
    const row = asRecord(item)
    if (!row) return []
    return [{
      doctype: typeof row.doctype === "string" ? row.doctype : typeof row.doc_type === "string" ? row.doc_type : undefined,
      uri: typeof row.uri === "string" ? row.uri : undefined,
      name: typeof row.name === "string" ? row.name : undefined,
    }]
  })
}

async function lockerGet(path: string, token: string) {
  const response = await fetch(`${digilockerBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json, application/xml, text/xml" },
    cache: "no-store",
  })
  const text = await response.text()
  return { ok: response.ok, text }
}

export function digilockerAuthorizeUrl(input: {
  nonce: string
  verifier: string
  documentType: IdDocumentType
  redirectUri: string
}) {
  const clientId = process.env.DIGILOCKER_CLIENT_ID ?? ""
  const url = new URL(`${digilockerBase()}/public/oauth2/1/authorize`)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", input.redirectUri)
  url.searchParams.set("state", input.nonce)
  url.searchParams.set("code_challenge", codeChallenge(input.verifier))
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("scope", "openid")
  url.searchParams.set("req_doctype", lockerDoctype(input.documentType))
  url.searchParams.set("purpose", "Verify your Indian Gaming Network profile")
  return url.toString()
}

export async function exchangeDigilockerCode(input: {
  code: string
  verifier: string
  redirectUri: string
  documentType: IdDocumentType
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    client_id: process.env.DIGILOCKER_CLIENT_ID ?? "",
    client_secret: process.env.DIGILOCKER_CLIENT_SECRET ?? "",
    redirect_uri: input.redirectUri,
    code_verifier: input.verifier,
  })
  const tokenResponse = await fetch(`${digilockerBase()}/public/oauth2/2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    cache: "no-store",
  })
  const tokenPayload = asRecord(await tokenResponse.json().catch(() => null))
  const token = typeof tokenPayload?.access_token === "string" ? tokenPayload.access_token : ""
  if (!tokenResponse.ok || !token) return null

  const user = await lockerGet("/public/oauth2/1/user", token)
  let governmentName = user.ok ? readName(safeJson(user.text)) : null
  let referenceText = user.ok ? user.text : ""

  if (input.documentType === "aadhaar") {
    const aadhaar = await lockerGet("/public/oauth2/3/xml/eaadhaar", token)
    if (aadhaar.ok && aadhaar.text) {
      referenceText = aadhaar.text
      governmentName = readName(safeJson(aadhaar.text)) ?? nameFromXml(aadhaar.text) ?? governmentName
    }
  }

  if (!last4FromDocument(input.documentType, referenceText)) {
    const files = await lockerGet("/public/oauth2/1/files/issued", token)
    const match = issuedFiles(safeJson(files.text)).find((file) => file.doctype?.toUpperCase() === lockerDoctype(input.documentType))
    if (match?.uri) {
      const secret = process.env.DIGILOCKER_CLIENT_SECRET ?? ""
      const hmac = createHmacHex(secret, match.uri)
      const fileResponse = await fetch(`${digilockerBase()}/public/oauth2/1/file/${encodeURIComponent(match.uri)}`, {
        headers: { Authorization: `Bearer ${token}`, hmac, Accept: "application/xml, text/xml, application/json" },
        cache: "no-store",
      })
      const fileText = await fileResponse.text()
      if (fileResponse.ok && fileText) {
        referenceText = fileText
        governmentName = nameFromXml(fileText) ?? readName(safeJson(fileText)) ?? governmentName
      }
    }
  }

  const last4 = last4FromDocument(input.documentType, referenceText)
  if (!last4 || !governmentName) return null
  return { last4, governmentName }
}

function safeJson(text: string) {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function nameFromXml(text: string) {
  const match = text.match(/\bname="([^"]{2,120})"/i)
  return match ? match[1].trim().replace(/\s+/g, " ") : null
}

function createHmacHex(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("base64")
}
