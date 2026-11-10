export const PROMO_PRICE_PAISE = 49900
export const PROMO_PRICE_LABEL = "₹499"

export function promoPaymentsReady() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

export function promoIsLive(promo: { payment_status: string; expires_at: string | null }) {
  if (promo.payment_status !== "paid") return false
  if (!promo.expires_at) return false
  return new Date(promo.expires_at).getTime() > Date.now()
}
