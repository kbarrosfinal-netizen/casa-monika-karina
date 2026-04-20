import { useEffect, useState } from 'react'

export type SyncStatus = 'ok' | 'offline' | 'syncing'

export function useSyncStatus(): SyncStatus {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online ? 'ok' : 'offline'
}
