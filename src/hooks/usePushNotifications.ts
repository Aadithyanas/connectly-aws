'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/utils/api'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function usePushNotifications() {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subscribeToPush = useCallback(async (silent = false) => {
    try {
      setError(null)
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!silent) throw new Error('Push notifications are not supported in this browser.')
        return false
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      // If silent mode, only proceed if permission is already granted
      if (silent) {
        const currentPermission = Notification.permission
        if (currentPermission !== 'granted') return false
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          throw new Error('Permission denied. Please enable notifications in your browser settings.')
        }
      }

      let subscription = await registration.pushManager.getSubscription()
      
      // If existing subscription was created with wrong VAPID key, unsubscribe and re-create
      if (subscription) {
        try {
          // Test if the existing subscription is valid by checking its key
          const subJson = subscription.toJSON()
          if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
            await subscription.unsubscribe()
            subscription = null
          }
        } catch {
          if (subscription) await subscription.unsubscribe()
          subscription = null
        }
      }

      if (!subscription) {
        if (!VAPID_PUBLIC_KEY) {
          if (!silent) throw new Error('VAPID public key not set in environment.')
          return false
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        })
      }

      if (!user) return false

      const subJson = subscription.toJSON()
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        if (!silent) throw new Error('Failed to generate subscription keys.')
        return false
      }

      await api.post('/push-subscriptions', {
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth
      })

      setIsSubscribed(true)
      if (!silent) toast.success('Notifications enabled successfully!')
      return true
    } catch (err: any) {
      console.error('[PushNotifications] Error:', err)
      const msg = err.message || 'Failed to subscribe'
      setError(msg)
      if (!silent) toast.error(msg)
      return false
    }
  }, [user])

  // Auto-subscribe silently when permission is already granted (user previously allowed)
  // Also re-subscribe on every load to keep the subscription fresh after VAPID key changes
  useEffect(() => {
    if (!user) return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return

    // Small delay to let the app fully initialize
    const timer = setTimeout(() => {
      subscribeToPush(true).then(success => {
        if (success) console.log('[PushNotifications] Auto-subscribed silently')
      })
    }, 2000)

    return () => clearTimeout(timer)
  }, [user, subscribeToPush])

  // Check initial state
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(!!sub)
      })
    })
  }, [])

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
