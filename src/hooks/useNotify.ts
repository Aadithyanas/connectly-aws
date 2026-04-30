'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'

// Reuse the same lazy singleton socket as usePresence
let _io: any = null

async function getSocket() {
  if (typeof window === 'undefined') return null
  if (_io) return _io
  const { io } = await import('socket.io-client')
  _io = io('http://127.0.0.1:4002', { transports: ['websocket'], autoConnect: true })
  return _io
}

/**
 * useNotify Hook
 *
 * Subscribes to the user's personal notification room via Socket.io.
 * Receives 'ping' events emitted by the backend for UI refresh triggers.
 * Previously used Supabase broadcast channels; migrated to Socket.io to
 * eliminate the auth-js _callRefreshToken loop caused by .subscribe().
 */
export function useNotify(onNotify: (payload: any) => void) {
  const { user } = useAuth()
  const callbackRef = useRef(onNotify)

  useEffect(() => {
    callbackRef.current = onNotify
  }, [onNotify])

  useEffect(() => {
    if (!user?.id) return
    let isMounted = true

    getSocket().then((socket) => {
      if (!socket || !isMounted) return

      // Join user's notification room
      socket.emit('join_notifications', user.id)

      socket.on('ping', (payload: any) => {
        if (isMounted) callbackRef.current(payload)
      })

      socket.on('notification', (payload: any) => {
        if (isMounted) callbackRef.current(payload)
      })
    })

    return () => {
      isMounted = false
    }
  }, [user?.id])
}
