'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'

// Lazy singleton Socket.io client — only imported when first needed (browser only)
let _io: any = null

async function getSocket() {
  if (typeof window === 'undefined') return null
  if (_io) return _io
  const { io } = await import('socket.io-client')
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api$/, '') : 'https://api.aadithyan.in')
  _io = io(url, { transports: ['websocket'], autoConnect: true })
  return _io
}

export function usePresence(channelName: string = 'global') {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({})
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const { user } = useAuth()
  const socketRef = useRef<any>(null)

  useEffect(() => {
    if (!user?.id) return
    let isMounted = true

    getSocket().then((socket) => {
      if (!socket || !isMounted) return
      socketRef.current = socket

      // Join the presence room
      socket.emit('join_presence', user.id)

      // Update online users map
      socket.on('presence_update', ({ userId, status }: any) => {
        if (!isMounted) return
        setOnlineUsers((prev) => {
          const next = { ...prev }
          if (status === 'online') {
            next[userId] = { userId, online_at: new Date().toISOString() }
          } else {
            delete next[userId]
          }
          return next
        })
      })

      // Typing events
      socket.on('typing', ({ userId: tUserId, isTyping }: any) => {
        if (!isMounted) return
        setTypingUsers((prev) => ({ ...prev, [tUserId]: isTyping }))
      })
    })

    return () => {
      isMounted = false
      if (socketRef.current) {
        socketRef.current.emit('leave_presence', user.id)
        socketRef.current.off('presence_update')
        socketRef.current.off('typing')
      }
    }
  }, [user?.id, channelName])

  const sendTypingStatus = async (isTyping: boolean) => {
    if (!user?.id || !socketRef.current) return
    socketRef.current.emit('typing', { userId: user.id, chatId: channelName, isTyping })
  }

  return { onlineUsers, typingUsers, sendTypingStatus }
}
