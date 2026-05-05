'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { socketService } from '@/utils/socket'

export function usePresence(channelName: string = 'global') {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({})
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({})
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return
    let isMounted = true

    // Use the shared socketService instead of creating a separate connection
    const socket = socketService.getSocket()
    if (!socket) return

    // Join the presence room (CallContext also does this, but it's idempotent)
    socket.emit('join_presence', user.id)

    // Update online users map
    const handlePresence = ({ userId, status }: any) => {
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
    }

    // Typing events
    const handleTyping = ({ userId: tUserId, isTyping }: any) => {
      if (!isMounted) return
      setTypingUsers((prev) => ({ ...prev, [tUserId]: isTyping }))
    }

    socket.on('presence_update', handlePresence)
    socket.on('typing', handleTyping)

    return () => {
      isMounted = false
      socket.off('presence_update', handlePresence)
      socket.off('typing', handleTyping)
    }
  }, [user?.id, channelName])

  const sendTypingStatus = async (isTyping: boolean) => {
    if (!user?.id) return
    const socket = socketService.getSocket()
    if (!socket) return
    socket.emit('typing', { userId: user.id, chatId: channelName, isTyping })
  }

  return { onlineUsers, typingUsers, sendTypingStatus }
}
