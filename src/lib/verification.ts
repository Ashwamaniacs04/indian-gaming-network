import { createHash, createHmac, randomBytes } from "crypto"

export const ID_DOCUMENT_TYPES = ["aadhaar", "pan", "driving_licence"] as const
export type IdDocumentType = (typeof ID_DOCUMENT_TYPES)[number]

export const ID_DOCUMENT_LABELS: Record<IdDocumentType, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  driving_licence: "Driving licence",
}

const LOCKER_DOCTYPE: Record<IdDocumentType, string> = {
  aadhaar: "ADHAR",
  pan: "PANCR",
  driving_licence: "DRVLC",
}

const GSTIN_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

export function isIdDocumentType(value: string): value is IdDocumentType {
  return (ID_DOCUMENT_TYPES as readonly string[]).includes(value)
}

export function digilockerReady() {
  return Boolean(
    process.env.DIGILOCKER_CLIENT_ID &&
      process.env.DIGILOCKER_CLIENT_SECRET &&
      process.env.VERIFICATION_HMAC_SECRET &&
      process.env.VERIFICATION_HMAC_SECRET.length >= 16,
  )
}

export function gstReady() {
  return Boolean(
    process.env.GST_API_URL &&
      process.env.GST_API_KEY &&
      process.env.VERIFICATION_HMAC_SECRET &&
      process.env.VERIFICATION_HMAC_SECRET.length >= 16,
  )
}

export function lockerDoctype(type: IdDocumentType) {
  return LOCKER_DOCTYPE[type]
}

export function createCodeVerifier() {
  return randomBytes(32).toString("base64url")
}

export function codeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url")
}

export function verificationSignature(payload: string) {
  const secret = process.env.VERIFICATION_HMAC_SECRET ?? ""
  return createHmac("sha256", secret).update(payload).digest("hex")
}

export function profileVerificationPayload(
  userId: string,
  documentType: string,
  last4: string,
  governmentName: string,
  nonce: string,
) {
  return ["profile", userId, documentType, last4, governmentName, nonce].join("|")
}

export function pageVerificationPayload(
  userId: string,
  pageId: string,
  gstin: string,
  legalName: string,
  nonce: string,
) {
  return ["page", userId, pageId, gstin, legalName, nonce].join("|")
}

export function gstinChecksum(first14: string) {
  let factor = 2
  let sum = 0
  for (let index = first14.length - 1; index >= 0; index -= 1) {
    const code = GSTIN_ALPHABET.indexOf(first14[index] ?? "")
    if (code < 0) return ""
    let product = code * factor
    factor = factor === 2 ? 1 : 2
    product = Math.floor(product / 36) + (product % 36)
    sum += product
  }
  return GSTIN_ALPHABET[(36 - (sum % 36)) % 36] ?? ""
}

export function normalizeGstin(value: string) {
  return value.toUpperCase().replace(/\s/g, "")
}

export function gstinIsValid(value: string) {
  const gstin = normalizeGstin(value)
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) return false
  return gstin[14] === gstinChecksum(gstin.slice(0, 14))
}

export function last4FromDocument(type: IdDocumentType, text: string) {
  if (type === "aadhaar") {
    const masked = text.match(/[Xx*]{8}(\d{4})/)
    if (masked) return masked[1]
    const full = text.match(/\b(\d{12})\b/)
    return full ? full[1].slice(-4) : null
  }
  if (type === "pan") {
    const pan = text.toUpperCase().match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/)
    return pan ? pan[1].slice(-4) : null
  }
  const licence = text.toUpperCase().match(/\b([A-Z]{2}[0-9]{2}[A-Z0-9]{7,})\b/)
  if (licence) return licence[1].slice(-4)
  const tokens = text.toUpperCase().match(/[A-Z0-9]{6,}/g) ?? []
  const longest = tokens.sort((left, right) => right.length - left.length)[0]
  return longest ? longest.slice(-4) : null
}

export function digilockerBase() {
  return (process.env.DIGILOCKER_BASE_URL ?? "https://digilocker.meripehchaan.gov.in").replace(/\/$/, "")
}
