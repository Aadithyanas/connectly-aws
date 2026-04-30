'use client'

import { useState, useCallback } from 'react'
import { api } from '@/utils/api'
import { useAuth } from '@/context/AuthContext'

export type GroupRole = 'admin' | 'member'
export type MemberStatus = 'joined' | 'invited' | 'requesting'

export function useGroups() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  const createGroup = useCallback(async (name: string, description: string, isPublic: boolean, initialMemberIds: string[] = []) => {
    if (!user) return { error: 'Not authenticated' }
    setLoading(true)

    try {
      const chat = await api.post('/chats/create', {
        name,
        description,
        is_public: isPublic,
        is_group: true,
        memberIds: initialMemberIds
      })

      return { data: chat, error: null }
    } catch (err: any) {
      return { error: err.message || 'Failed to create community' }
    } finally {
      setLoading(false)
    }
  }, [user])

  const inviteUser = useCallback(async (chatId: string, targetUserId: string) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      // Backend should ideally handle status logic based on roles
      // For now, we'll just try to add them
      await api.post(`/chats/${chatId}/members`, { userId: targetUserId })
      return { error: null, status: 'invited' as MemberStatus }
    } catch (err: any) {
      return { error: err.message }
    }
  }, [user])

  const acceptInvitation = useCallback(async (chatId: string) => {
    if (!user) return { error: 'Not authenticated' }
    try {
      await api.put(`/chats/${chatId}/members/${user.id}`, { status: 'joined' })
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }, [user])

  const requestJoin = useCallback(async (chatId: string) => {
    if (!user) return { error: 'Not authenticated' }
    try {
      await api.post(`/chats/${chatId}/members`, { userId: user.id, status: 'requesting' })
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }, [user])

  return { loading, createGroup, inviteUser, acceptInvitation, requestJoin }
}
