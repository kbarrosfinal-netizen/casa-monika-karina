export type Platform = 'ios' | 'android' | 'desktop'

export function detectPlatform(ua: string = navigator.userAgent): Platform {
  const lowered = ua.toLowerCase()
  if (/iphone|ipad|ipod/.test(lowered)) return 'ios'
  if (/android/.test(lowered)) return 'android'
  return 'desktop'
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}
