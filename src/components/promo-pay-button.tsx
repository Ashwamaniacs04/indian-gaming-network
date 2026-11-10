"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PROMO_PRICE_LABEL } from "@/lib/promo"
import { beginPromoPayment, confirmPromoPayment } from "@/server/actions/promos"

type CheckoutResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true)
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function PromoPayButton({ promoId, gameTitle }: { promoId: string; gameTitle: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function pay() {
    setPending(true)
    setError(null)
    const started = await beginPromoPayment(promoId)
    if (started.error || !started.orderId || !started.keyId || !started.amount) {
      setError(started.error ?? "Payment could not be started.")
      setPending(false)
      return
    }
    const ready = await loadRazorpay()
    if (!ready || !window.Razorpay) {
      setError("The payment window could not be opened.")
      setPending(false)
      return
    }
    const checkout = new window.Razorpay({
      key: started.keyId,
      amount: started.amount,
      currency: "INR",
      name: "Indian Gaming Network",
      description: gameTitle,
      order_id: started.orderId,
      handler: async (response: CheckoutResponse) => {
        const result = await confirmPromoPayment({
          promoId,
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        })
        if (result?.error) setError(result.error)
        else router.refresh()
        setPending(false)
      },
      modal: { ondismiss: () => setPending(false) },
    })
    checkout.open()
  }

  return (
    <div>
      <Button type="button" onClick={pay} disabled={pending}>
        {pending ? "Opening payment…" : `Pay ${PROMO_PRICE_LABEL} and publish`}
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
