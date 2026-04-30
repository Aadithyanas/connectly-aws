'use client'

import { useEffect } from 'react'
import { api } from '@/utils/api'
import { useAuth } from '@/context/AuthContext'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function usePushNotifications() {
  const { user } = useAuth()

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    const subscribeUser = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        let subscription = await registration.pushManager.getSubscription()
        
        if (!subscription) {
          if (!VAPID_PUBLIC_KEY) {
            console.warn('[PushNotifications] VAPID public key not set — skipping push subscription.')
            return
          }

          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          })
        }

        if (!user) return

        // Save subscription via our own API (not Supabase)
        const subJson = subscription.toJSON()
        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return

        await api.post('/push-subscriptions', {
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth
        })

      } catch (error) {
        console.error('[PushNotifications] Error during push subscription:', error)
      }
    }

    subscribeUser()
  }, [user])
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
