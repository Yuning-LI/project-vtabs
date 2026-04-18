import { isGaTrackingDisabled } from '@/lib/analytics/optOut'
import { gaMeasurementId } from '@/lib/site'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

type GaEventParams = Record<string, string | number | boolean | null | undefined>

export function sendGaEvent(eventName: string, params: GaEventParams = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return
  }
  if (!gaMeasurementId || isGaTrackingDisabled(gaMeasurementId)) {
    return
  }

  const normalizedParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined)
  )

  window.gtag('event', eventName, normalizedParams)
}
