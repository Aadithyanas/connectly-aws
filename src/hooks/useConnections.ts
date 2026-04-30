'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/utils/api'
import { useAuth } from '@/context/AuthContext'

export function useConnections(targetUserId?: string) {
  const [stats, setStats] = useState({ followers: 0, following: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const { user } = useAuth()

  const fetchStats = useCallback(async () => {
    if (!targetUserId) return
    
    try {
      const data = await api.get(`/connections/${targetUserId}`)
      if (data) {
        setStats({
          followers: data.followers?.length || 0,
          following: data.following?.length || 0
        })
        setIsFollowing(data.followers?.some((f: any) => f.id === user?.id) || false)
      }
    } catch (err) {
      console.error('Error fetching connection stats:', err)
    }
  }, [targetUserId, user])

  useEffect(() => {
    fetchStats()
  }, [targetUserId, fetchStats])

  const toggleFollow = async () => {
    if (!user || !targetUserId || user.id === targetUserId || loading) return
    
    setLoading(true)
    // Optimistic UI
    const previousState = isFollowing
    setIsFollowing(!previousState)
    setStats(prev => ({
      ...prev,
      followers: previousState ? Math.max(0, prev.followers - 1) : prev.followers + 1
    }))

    try {
      if (previousState) {
        await api.post('/connections/unfollow', { followingId: targetUserId })
      } else {
        await api.post('/connections/follow', { followingId: targetUserId })
      }
    } catch (err) {
      console.error('Follow toggle failed:', err)
      // Rollback
      setIsFollowing(previousState)
      fetchStats() // Correct counts
    } finally {
      setLoading(false)
    }
  }

  return {
    followersCount: stats.followers,
    followingCount: stats.following,
    isFollowing,
    toggleFollow,
    loading,
    refresh: fetchStats
  }
}
