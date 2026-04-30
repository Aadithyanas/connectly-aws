'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/utils/api'
import { useAuth } from '@/context/AuthContext'

export interface Status {
  id: string
  user_id: string
  content_url: string
  content_type: 'image' | 'video'
  caption?: string
  created_at: string
  expires_at: string
  impressions_count?: number
  user?: {
    name: string
    avatar_url: string
  }
}

export function useStatuses() {
  const [myStatuses, setMyStatuses] = useState<Status[]>([])
  const [partnerStatuses, setPartnerStatuses] = useState<Record<string, Status[]>>({})
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  // Hydrate from cache on mount
  useEffect(() => {
    if (user) {
      try {
        const savedMy = localStorage.getItem(`my_statuses_${user.id}`)
        const savedPartner = localStorage.getItem(`partner_statuses_${user.id}`)
        if (savedMy) setMyStatuses(JSON.parse(savedMy))
        if (savedPartner) setPartnerStatuses(JSON.parse(savedPartner))
      } catch (e) {}
    }
  }, [user])

  const fetchStatuses = useCallback(async () => {
    if (!user) return

    try {
      const data = await api.get('/statuses/feed')
      const formatted: Status[] = data.map((s: any) => ({
        ...s,
        content_url: s.media_url || s.content_url,
        content_type: s.media_type || s.content_type,
        caption: s.content || s.caption,
        impressions_count: Number(s.impressions_count) || 0,
        user: s.profiles || s.user || { name: s.author_name, avatar_url: s.author_avatar }
      }))

      // Grouping
      const currentUserId = user.id;
      const mine = formatted.filter(s => s.user_id === currentUserId)
      const others = formatted.filter(s => s.user_id !== currentUserId)
      
      const othersGrouped = others.reduce((acc, status) => {
        if (!acc[status.user_id]) acc[status.user_id] = []
        acc[status.user_id].push(status)
        return acc
      }, {} as Record<string, Status[]>)

      setMyStatuses(mine)
      setPartnerStatuses(othersGrouped)
      
      if (user?.id && (mine.length > 0 || Object.keys(othersGrouped).length > 0)) {
        localStorage.setItem(`my_statuses_${user.id}`, JSON.stringify(mine))
        localStorage.setItem(`partner_statuses_${user.id}`, JSON.stringify(othersGrouped))
      }
    } catch (error) {
      console.error('Error fetching statuses:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return

    // Initial fetch
    fetchStatuses()

    // Loading fail-safe timeout
    const timeoutId = setTimeout(() => {
      setLoading(false)
    }, 8000)

    // Polling setup
    let intervalId: NodeJS.Timeout

    const startPolling = () => {
      const isIdle = document.visibilityState === 'hidden'
      const interval = isIdle ? 90000 : 45000 // 45s active / 90s idle
      
      intervalId = setInterval(() => {
        fetchStatuses()
      }, interval)
    }

    startPolling()

    const handleVisibilityChange = () => {
      clearInterval(intervalId)
      // If we just became visible, refresh immediately
      if (document.visibilityState === 'visible') {
        fetchStatuses()
      }
      startPolling()
    }

    const handleAppRefresh = () => {
      fetchStatuses()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('app:refresh', handleAppRefresh)

    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('app:refresh', handleAppRefresh)
    }
  }, [fetchStatuses, user])

  const uploadStatus = async (file: File, caption?: string) => {
    if (!user) return { error: 'Not authenticated' }

    // 1. Determine resource type and set limits
    const isVideo = file.type.startsWith('video/')
    const resourceType = isVideo ? 'video' : (file.type.startsWith('image/') ? 'image' : 'raw')
    
    // Limits: Video = 100MB, Others = 10MB
    const limit = (resourceType === 'video') ? 100 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > limit) {
      return { error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max limit is ${(limit / (1024 * 1024))}MB.` }
    }

    try {
      // 2. Get Signature via API (still keeping next.js route for cloudinary if it exists, otherwise assume our custom node api provides it)
      const signRes = await fetch('/api/cloudinary/sign', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: `statuses/${user.id}` }) 
      })
      const signData = await signRes.json()
      if (!signRes.ok) throw new Error(signData.error || 'Failed to get signature')

      // 3. Upload to Cloudinary using correct endpoint
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', signData.apiKey)
      formData.append('timestamp', signData.timestamp)
      formData.append('signature', signData.signature)
      formData.append('folder', `statuses/${user.id}`)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signData.cloudName}/${resourceType}/upload`, {
        method: 'POST',
        body: formData
      })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Upload failed')

      const publicUrl = uploadData.secure_url;
      const contentType = file.type.startsWith('video') ? 'video' : 'image';

      // 4. Create Status via Custom API Route
      await api.post('/statuses', {
        media_url: publicUrl,
        media_type: contentType,
        content: caption || '',
        privacy_type: 'public',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      return { success: true }
    } catch (err: any) {
      console.error('Status upload failed:', err)
      return { error: err.message }
    }
  }

  const deleteStatus = async (statusId: string) => {
    if (!user) return { error: 'Not authenticated' }
    try {
      await api.delete(`/statuses/${statusId}`)
      await fetchStatuses()
      return { success: true }
    } catch (err: any) {
      console.error('Failed to delete status:', err)
      return { error: err.message }
    }
  }

  const fetchStatusViewers = useCallback(async (statusId: string) => {
    if (!user) return []
    
    try {
      const data = await api.get(`/statuses/${statusId}/viewers`)
      return (data || []).map((sv: any) => ({
        ...sv,
        viewed_at: sv.viewed_at
      }))
    } catch (err) {
      console.error('Error fetching viewers:', err)
      return []
    }
  }, [user])

  return { myStatuses, partnerStatuses, loading, uploadStatus, deleteStatus, fetchStatusViewers, refresh: fetchStatuses }
}
