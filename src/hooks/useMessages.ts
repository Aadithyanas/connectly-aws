import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/utils/api'
import { socketService } from '@/utils/socket'
import { useAuth } from '@/context/AuthContext'

const STATUS_ORDER: Record<string, number> = { sending: 0, sent: 1, delivered: 2, seen: 3 }

function isStatusForward(oldStatus: string, newStatus: string): boolean {
  return (STATUS_ORDER[newStatus] ?? 0) > (STATUS_ORDER[oldStatus] ?? 0)
}

export function useMessages(chatId?: string) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  
  const currentUserRef = useRef<any>(null)
  
  useEffect(() => {
    currentUserRef.current = user
  }, [user])
  
  const markAsSeen = useCallback(async () => {
    if (!chatId || !user) return
    try {
      const socket = socketService.getSocket()
      socket.emit('chat_read', { chatId, readerId: user.id, status: 'seen' })
      // If we implement the API later, we can uncomment this:
      // await api.post(`/messages/${chatId}/seen`, {})
    } catch(e) {}
  }, [chatId, user])

  const markAsDelivered = useCallback(async () => {
    if (!chatId || !user) return
    try {
      const socket = socketService.getSocket()
      socket.emit('chat_read', { chatId, readerId: user.id, status: 'delivered' })
    } catch(e) {}
  }, [chatId, user])

  useEffect(() => {
    let isMounted = true

    if (!chatId) {
      setLoading(false)
      return
    }

    const fetchMessages = async () => {
      setLoading(true)
      try {
        const data = await api.get(`/messages/chat/${chatId}`)
        if (isMounted) {
          setMessages(data || [])
          markAsSeen()
        }
      } catch (err) {
        console.error('Failed to fetch messages', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchMessages()

    const socket = socketService.getSocket()
    
    const handleNewMessage = (payload: any) => {
      if (payload.chat_id !== chatId) return
      const me = currentUserRef.current

      setMessages((prev) => {
        // Dedup: if message already exists (by id or matching client_id temp), update it
        const existingById = prev.find(m => m.id === payload.id)
        const existingByClientId = payload.client_id
          ? prev.find(m => m.client_id === payload.client_id || m.id === payload.client_id)
          : null

        if (existingById) {
          // Already in list — update status only if forwarding (sent→delivered→seen)
          return prev.map(m => m.id === payload.id && isStatusForward(m.status, payload.status)
            ? { ...m, status: payload.status }
            : m
          )
        }
        if (existingByClientId) {
          // Sender's optimistic message — replace temp with real (already done in sendMessage callback)
          return prev
        }
        return [...prev, payload]
      })

      // Recipient auto-marks as seen
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
      
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id === me.id && isStatusForward(m.status, status)
            ? { ...m, status }
            : m
        )
      )
    }
    
    socket.on('new_message', handleNewMessage)
    socket.on('chat_read', handleChatRead)
    
    socket.emit('join_chat', chatId)

    return () => {
      isMounted = false
      socket.off('new_message', handleNewMessage)
      socket.off('chat_read', handleChatRead)
      socket.emit('leave_chat', chatId)
    }
  }, [chatId, markAsSeen, markAsDelivered])

  const sendMessage = async (content: string, mediaUrl?: string, mediaType?: string, replyTo?: string, mediaFile?: File, recipientId?: string) => {
    if (!user || !chatId) return

    let finalMediaUrl = mediaUrl
    let finalMediaType = mediaType

    if (mediaFile && !mediaUrl) {
      finalMediaUrl = URL.createObjectURL(mediaFile)
      const type = mediaFile.type.split('/')[0]
      finalMediaType = type === 'image' || type === 'video' || type === 'audio' ? type : 'file'
    }

    const tempId = `temp-${Date.now()}`
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
    if (replyTo) msgData.reply_to = replyTo

    setMessages((prev) => [...prev, msgData])

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
        reply_to: replyTo,
        client_id: tempId
      })

      const data = result
      if (data && data.id) {
        // Replace the optimistic temp message with the real saved message
        setMessages((prev) => prev.map(m => m.id === tempId ? { ...data, status: 'sent', sender: msgData.sender } : m))
        // NOTE: Server now broadcasts new_message to the room — no need to emit from client
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

  const uploadFile = async (file: File) => {
    // keeping cloudinary logic untouched
    const isVideo = file.type.startsWith('video/')
    const isAudio = file.type.startsWith('audio/')
    const resourceType = (isVideo || isAudio) ? 'video' : (file.type.startsWith('image/') ? 'image' : 'raw')
    
    try {
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

      return { publicUrl: uploadData.secure_url, mediaType: resourceType }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return { messages, loading, sendMessage, uploadFile, markAsSeen, forwardMessage, deleteMessage }
}
