'use client'

import { useEffect, useState } from 'react'
import { api } from '@/utils/api'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'react-hot-toast'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function usePushNotifications() {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check initial state
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(!!sub)
      })
    })
  }, [])

  const subscribeToPush = async () => {
    try {
      setError(null)
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported in this browser.')
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        throw new Error('Permission denied. Please enable notifications in your browser settings.')
      }

      let subscription = await registration.pushManager.getSubscription()
      
      if (!subscription) {
        if (!VAPID_PUBLIC_KEY) {
          throw new Error('VAPID public key not set in environment.')
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })
      }

      if (!user) return false

      const subJson = subscription.toJSON()
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error('Failed to generate subscription keys.')
      }

      await api.post('/push-subscriptions', {
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth
      })

      setIsSubscribed(true)
      toast.success('Notifications enabled successfully!')
      return true
    } catch (err: any) {
      console.error('[PushNotifications] Error:', err)
      const msg = err.message || 'Failed to subscribe'
      setError(msg)
      toast.error(msg)
      return false
    }
  }

  return { isSubscribed, subscribeToPush, error }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
