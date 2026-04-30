'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/utils/api'
import { socketService } from '@/utils/socket'
import { useAuth } from '@/context/AuthContext'

const HEARTBEAT_INTERVAL = 30000 // 30 seconds
const OFFLINE_THRESHOLD = 180000 // 180 seconds without heartbeat = offline

export function useOnlineStatus() {
  const { user } = useAuth()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let userId: string | null = null

    const init = async () => {
      if (!user) return
      userId = user.id

      // Set online immediately
      try {
        const token = localStorage.getItem('token')
        if (token) {
          await fetch('http://127.0.0.1:4002/api/profiles/status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'online' })
          })
        }
      } catch (e) { }

      const socket = socketService.getSocket()
      socket.emit('join_presence', userId)

      // Heartbeat: update last_seen every 30 seconds
      intervalRef.current = setInterval(async () => {
        try {
          const token = localStorage.getItem('token')
          if (!token) return
          // Use direct fetch to avoid the api utility's console logging of errors
          await fetch('http://127.0.0.1:4002/api/profiles/status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: 'online' })
          })
        } catch (e) {
          // Silently ignore non-critical heartbeat failures
        }
      }, HEARTBEAT_INTERVAL)
    }

    init()

    // Best-effort: try to set offline on tab close
    const handleBeforeUnload = () => {
      if (userId) {
        // Use sendBeacon for reliability on tab close
        const url = 'http://127.0.0.1:4002/api/profiles/status'
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
        navigator.sendBeacon(url, JSON.stringify({ status: 'offline' }))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      window.removeEventListener('beforeunload', handleBeforeUnload)

      // Set offline on unmount
      if (userId) {
        api.post('/profiles/status', { status: 'offline' }).catch(() => { })
      }
    }
  }, [user])
}

// Helper: static check if a user is truly online based on last_seen timestamp
export function isUserOnline(profile: { status?: string; last_seen?: string }): boolean {
  if (profile.status !== 'online') return false
  if (!profile.last_seen) return false

  const lastSeen = new Date(profile.last_seen).getTime()
  const now = Date.now()
  return (now - lastSeen) < OFFLINE_THRESHOLD
}

// Reactive Hook: updates the UI automatically if the user goes offline due to missing heartbeats
export function useIsUserOnline(profile: { status?: string; last_seen?: string } | null | undefined): boolean {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    if (!profile) {
      setIsOnline(false)
      return
    }

    const check = () => {
      setIsOnline(isUserOnline(profile))
    }

    // Initial check
    check()

    // Poll every 10 seconds to catch timeout
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [profile])

  return isOnline
}
