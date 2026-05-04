import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/utils/api'
import { socketService } from '@/utils/socket'
import { useAuth } from '@/context/AuthContext'

const STATUS_ORDER: Record<string, number> = { sending: 0, sent: 1, delivered: 2, seen: 3 }
const CACHE_KEY = (chatId: string) => `chat_msgs_${chatId}`
const CACHE_LIMIT = 100 // Max messages to persist per chat in localStorage

function isStatusForward(oldStatus: string, newStatus: string): boolean {
  return (STATUS_ORDER[newStatus] ?? 0) > (STATUS_ORDER[oldStatus] ?? 0)
}

// Deduplicate a message array by id, keeping the entry with the higher status
function dedupMessages(msgs: any[]): any[] {
  const map = new Map<string, any>()
  for (const m of msgs) {
    const existing = map.get(m.id)
    if (!existing || isStatusForward(existing.status, m.status)) {
      // Merge to preserve rich optimistic fields (like 'reply' object) if the new update is missing them
      map.set(m.id, existing ? { ...existing, ...m, reply: existing.reply || m.reply } : m)
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

function saveToCache(chatId: string, messages: any[]) {
  try {
    // Only cache real (non-temp) messages
    const toCache = messages
      .filter(m => typeof m.id === 'string' && !m.id.startsWith('temp-'))
      .slice(-CACHE_LIMIT)
    localStorage.setItem(CACHE_KEY(chatId), JSON.stringify(toCache))
  } catch (_) {}
}

function loadFromCache(chatId: string): any[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY(chatId))
    if (!raw) return []
    const parsed: any[] = JSON.parse(raw)
    // Strip any stale optimistic/temp messages that might have slipped into older caches
    return parsed.filter(m => typeof m.id === 'string' && !m.id.startsWith('temp-'))
  } catch (_) {
    return []
  }
}

export function useMessages(chatId?: string) {
  const [messages, setMessages] = useState<any[]>(() => {
    if (typeof window === 'undefined' || !chatId) return []
    return loadFromCache(chatId)
  })
  // loading is only shown when there's no cached data yet for the chat
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined' || !chatId) return false
    try {
      const raw = localStorage.getItem(`chat_msgs_${chatId}`)
      const cached = raw ? JSON.parse(raw) : []
      return !cached || cached.length === 0
    } catch (_) { return true }
  })
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlderMessages, setHasOlderMessages] = useState(true)
  const { user } = useAuth()

  const currentUserRef = useRef<any>(null)
  const offsetRef = useRef(0)           // how many messages we've fetched total (for pagination)
  const PAGE_SIZE = 50                  // messages per page

  useEffect(() => {
    currentUserRef.current = user
  }, [user])

  const markAsSeen = useCallback(async () => {
    if (!chatId || !user) return
    try {
      const socket = socketService.getSocket()
      socket.emit('chat_read', { chatId, readerId: user.id, status: 'seen' })
    } catch(e) {}
  }, [chatId, user])

  const markAsDelivered = useCallback(async () => {
    if (!chatId || !user) return
    try {
      const socket = socketService.getSocket()
      socket.emit('chat_read', { chatId, readerId: user.id, status: 'delivered' })
    } catch(e) {}
  }, [chatId, user])

  // Merge server data into state, preserving pending optimistic messages
  const mergeServerMessages = useCallback((serverData: any[]) => {
    setMessages(prev => {
      const pendingOptimistic = prev.filter(
        m => typeof m.id === 'string' && m.id.startsWith('temp-')
      )
      
      // Filter out any temp message that has been confirmed by the server (matched by client_id)
      const filteredOptimistic = pendingOptimistic.filter(opt => 
        !serverData.some(srv => srv.client_id === opt.id || srv.id === opt.id)
      )

      const merged = dedupMessages([...serverData, ...filteredOptimistic])
      // Save real messages to cache (without temp)
      if (chatId) saveToCache(chatId, merged)
      return merged
    })
  }, [chatId])

  useEffect(() => {
    let isMounted = true

    if (!chatId) {
      setLoading(false)
      return
    }

    // 1. Restore from cache immediately for instant display
    const cached = loadFromCache(chatId)
    if (cached.length > 0) {
      setMessages(prev => prev.length === 0 ? cached : prev)
      // Cache hit: don't show loading spinner, fetch silently in background
      setLoading(false)
    } else {
      setMessages([])
      // No cache: show loading spinner until data arrives
      setLoading(true)
    }

    offsetRef.current = 0
    setHasOlderMessages(true)

    // 2. Silently fetch latest PAGE_SIZE messages from server in background
    const fetchMessages = async () => {
      // Only set loading=true if no cached data exists
      if (cached.length === 0) setLoading(true)
      try {
        const data = await api.get(`/messages/chat/${chatId}?limit=${PAGE_SIZE}&offset=0`)
        if (isMounted) {
          offsetRef.current = (data || []).length
          if ((data || []).length < PAGE_SIZE) {
            setHasOlderMessages(false)
          }
          mergeServerMessages(data || [])
          markAsSeen()
        }
      } catch (err) {
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchMessages()

    // 3. Re-fetch when user comes back to the tab (but not more than once every 5 seconds)
    let lastRefetch = Date.now()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        const now = Date.now()
        if (now - lastRefetch > 5000) {
          lastRefetch = now
          fetchMessages()
        }
      }
    }
    const handleFocus = () => {
      if (isMounted) {
        const now = Date.now()
        if (now - lastRefetch > 5000) {
          lastRefetch = now
          fetchMessages()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    const socket = socketService.getSocket()

    const handleNewMessage = (payload: any) => {
      if (payload.chat_id !== chatId) return
      const me = currentUserRef.current

      setMessages((prev) => {
        const existingById = prev.find(m => m.id === payload.id)
        const existingByClientId = payload.client_id
          ? prev.find(m => m.client_id === payload.client_id || m.id === payload.client_id)
          : null

        if (existingById) {
          const updated = prev.map(m => m.id === payload.id
            ? { ...m, ...payload, reply: m.reply || payload.reply, status: isStatusForward(m.status, payload.status) ? payload.status : m.status }
            : m
          )
          if (chatId) saveToCache(chatId, updated)
          return updated
        }

        if (existingByClientId) {
          // Merge: pick the highest status so we never downgrade (e.g. delivered → sent)
          const bestStatus = isStatusForward(existingByClientId.status, payload.status)
            ? payload.status
            : existingByClientId.status
          const updated = prev.map(m =>
            (m.client_id === payload.client_id || m.id === payload.client_id)
              ? { ...m, ...payload, reply: m.reply || payload.reply, status: bestStatus }
              : m
          )
          if (chatId) saveToCache(chatId, updated)
          return updated
        }

        const next = dedupMessages([...prev, payload])
        // Update cache with new message
        if (chatId) saveToCache(chatId, next)
        return next
      })

      if (payload.sender_id !== me?.id) {
        markAsDelivered()
        setTimeout(() => markAsSeen(), 500)
      }
    }

    const handleChatRead = (payload: any) => {
      if (payload.chatId !== chatId) return
      const { readerId, status } = payload
      const me = currentUserRef.current
      if (!me?.id || readerId === me.id) return

      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.sender_id === me.id && isStatusForward(m.status, status)
            ? { ...m, status }
            : m
        )
        // Persist updated statuses to cache so ticks survive re-opens
        if (chatId) saveToCache(chatId, updated)
        return updated
      })
    }

    socket.on('new_message', handleNewMessage)
    socket.on('chat_read', handleChatRead)
    socket.emit('join_chat', chatId)

    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      socket.off('new_message', handleNewMessage)
      socket.off('chat_read', handleChatRead)
      socket.emit('leave_chat', chatId)
    }
  }, [chatId, markAsSeen, markAsDelivered, mergeServerMessages])

  // ── Status poll fallback ─────────────────────────────────────────────────
  // If the backend socket relay for 'chat_read' doesn't reach the sender,
  // we poll the server every 8 s while there are messages stuck at 'sent'.
  // The server always has the authoritative status, so this guarantees ticks
  // upgrade to delivered / seen even when the socket event is missed.
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  useEffect(() => {
    if (!chatId || !user?.id) return

    const hasSentMessages = () =>
      messagesRef.current.some(m => m.status === 'sent' && m.sender_id === user.id)

    const pollStatus = async () => {
      if (!hasSentMessages()) return
      try {
        const data = await api.get(`/messages/chat/${chatId}?limit=${PAGE_SIZE}&offset=0`)
        if (data && data.length > 0) mergeServerMessages(data)
      } catch (_) {}
    }

    // Poll every 8 s — stops naturally when no 'sent' messages remain
    const interval = setInterval(pollStatus, 8000)
    return () => clearInterval(interval)
  }, [chatId, user?.id, mergeServerMessages])

  // Called when user scrolls to the TOP — loads older messages
  const loadOlderMessages = useCallback(async () => {
    if (!chatId || loadingOlder || !hasOlderMessages) return

    setLoadingOlder(true)
    try {
      const currentOffset = offsetRef.current
      const data = await api.get(`/messages/chat/${chatId}?limit=${PAGE_SIZE}&offset=${currentOffset}`)
      if (!data || data.length === 0) {
        setHasOlderMessages(false)
        return
      }
      if (data.length < PAGE_SIZE) {
        setHasOlderMessages(false)
      }
      offsetRef.current = currentOffset + data.length

      // Prepend older messages to the top
      setMessages(prev => {
        const merged = dedupMessages([...data, ...prev])
        return merged
      })
    } catch (err) {
      console.error('Failed to load older messages', err)
    } finally {
      setLoadingOlder(false)
    }
  }, [chatId, loadingOlder, hasOlderMessages])

  const sendMessage = async (content: string, mediaUrl?: string, mediaType?: string, replyTo?: string, mediaFile?: File, recipientId?: string) => {
    if (!user || !chatId) return

    let finalMediaUrl = mediaUrl
    let finalMediaType = mediaType

    if (mediaFile && !mediaUrl) {
      finalMediaUrl = URL.createObjectURL(mediaFile)
      const type = mediaFile.type.split('/')[0]
      finalMediaType = type === 'image' || type === 'video' || type === 'audio' ? type : 'file'
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 7)}`
    const msgData: any = {
      id: tempId,
      client_id: tempId,
      chat_id: chatId,
      sender_id: user.id,
      content,
      media_url: finalMediaUrl,
      media_type: finalMediaType,
      status: 'sending',
      created_at: new Date().toISOString(),
      sender: {
         name: user.name,
         avatar_url: user.avatar_url
      }
    }
    if (replyTo) {
      msgData.reply_to = typeof replyTo === 'string' ? replyTo : replyTo.id
      if (typeof replyTo === 'object') {
        msgData.reply = {
          id: replyTo.id,
          content: replyTo.content,
          sender_id: replyTo.sender_id
        }
      }
    }

    // Guard: never add the same temp message twice
    setMessages((prev) => {
      if (prev.some(m => m.id === tempId)) return prev
      return [...prev, msgData]
    })

    if (mediaFile) {
      const { publicUrl, mediaType: uType, error } = await uploadFile(mediaFile)
      if (error || !publicUrl) {
        setMessages((prev) => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m))
        return { error }
      }
      finalMediaUrl = publicUrl
      finalMediaType = uType
    }

    try {
      const result = await api.post('/messages/send', {
        chat_id: chatId,
        content,
        media_url: finalMediaUrl,
        media_type: finalMediaType,
        reply_to: typeof replyTo === 'string' ? replyTo : replyTo?.id,
        client_id: tempId
      })

      const data = result
      if (data && data.id) {
        setMessages((prev) => {
          const next = prev.map(m => {
            if (m.id === tempId) {
              const bestStatus = isStatusForward(m.status, 'sent') ? 'sent' : m.status
              return { ...m, ...data, reply: m.reply || data.reply, status: bestStatus, sender: msgData.sender }
            }
            return m
          })
          if (chatId) saveToCache(chatId, next)
          return next
        })
      }
      return { error: null }
    } catch (err: any) {
      setMessages((prev) => prev.filter(m => m.id !== tempId))
      return { error: err.message }
    }
  }

  const forwardMessage = async (messageContent: string, targetChatId: string, mediaUrl?: string, mediaType?: string) => {
    try {
      await api.post('/messages/send', {
        chat_id: targetChatId,
        content: messageContent,
        media_url: mediaUrl,
        media_type: mediaType,
        forwarded: true
      })
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  const deleteMessage = async (messageId: string, type: 'me' | 'everyone') => {
    try {
      await api.delete(`/messages/${messageId}`)
      if (type === 'me') {
        setMessages(prev => prev.filter(m => m.id !== messageId))
      } else {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: '', media_url: null, is_deleted_everyone: true } : m))
      }
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  const uploadQueue = useRef<Array<{ file: File, resolve: (val: any) => void }>>([])
  const isUploading = useRef(false)

  const processUploadQueue = async () => {
    if (isUploading.current || uploadQueue.current.length === 0) return
    isUploading.current = true
    
    const { file, resolve } = uploadQueue.current.shift()!
    try {
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      const resourceType = (isVideo || isAudio) ? 'video' : (file.type.startsWith('image/') ? 'image' : 'raw')

      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: `chat/${chatId || 'general'}` })
      })
      const signData = await signRes.json()

      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', signData.apiKey)
      formData.append('timestamp', signData.timestamp)
      formData.append('signature', signData.signature)
      formData.append('folder', `chat/${chatId || 'general'}`)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/${resourceType}/upload`, {
        method: 'POST',
        body: formData
      })
      const uploadData = await uploadRes.json()

      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message || 'Cloudinary upload failed')
      }

      resolve({ 
        publicUrl: uploadData.secure_url, 
        mediaType: resourceType === 'raw' ? 'file' : resourceType 
      })
    } catch (err: any) {
      resolve({ error: err.message })
    }
    
    isUploading.current = false
    processUploadQueue()
  }

  const uploadFile = (file: File): Promise<any> => {
    return new Promise((resolve) => {
      uploadQueue.current.push({ file, resolve })
      processUploadQueue()
    })
  }

  return {
    messages,
    loading,
    loadingOlder,
    hasOlderMessages,
    loadOlderMessages,
    sendMessage,
    uploadFile,
    markAsSeen,
    forwardMessage,
    deleteMessage
  }
}
