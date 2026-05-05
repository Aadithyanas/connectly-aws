'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { api } from '@/utils/api'
import { socketService } from '@/utils/socket'

import { Search, UserCircle, Home, Plus, Compass, CircleDashed, Trophy, Users, Globe, Briefcase } from 'lucide-react'
import Image from 'next/image'
import { isUserOnline } from '@/hooks/useOnlineStatus'

import SettingsModal from './SettingsModal'
import { useSettings } from '@/hooks/useSettings'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useNotify } from '@/hooks/useNotify'
import { Status } from '@/hooks/useStatuses'
import { useAuth } from '@/context/AuthContext'
import GroupDiscovery from './GroupDiscovery'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { Download } from 'lucide-react'

// Global lock to prevent multiple sidebar instances from hammering the DB simultaneously
let globalMarkDeliveredLock = false;
let lastMarkDeliveredTime = 0;

interface ChatSidebarProps {
  onSelectChat: (chatId: string, metadata?: { name: string, avatar?: string, isGroup?: boolean }) => void
  activeChatId?: string
  onOpenNewChat: () => void
  onOpenProfile: () => void
  onOpenSettings: () => void
  activeTab: 'chat' | 'feed' | 'initiative' | 'challenges' | 'groups' | 'jobs'
  onTabChange: (tab: 'chat' | 'feed' | 'initiative' | 'challenges' | 'groups' | 'jobs') => void
  isModalOpen?: boolean
}

export default function ChatSidebar({ onSelectChat, activeChatId, onOpenNewChat, onOpenProfile, onOpenSettings, activeTab, onTabChange, isModalOpen }: ChatSidebarProps) {
  usePushNotifications()
  const [chats, setChats] = useState<any[] | null>(null)
  const [groupSubTab, setGroupSubTab] = useState<'my' | 'community'>('my')
  const [loading, setLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [search, setSearch] = useState('')
  const { user, signOut, loading: authLoading, profile: authProfile } = useAuth()
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [imageError, setImageError] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isMounted, setIsMounted] = useState(false)
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())

  const { isInstallable, installApp } = usePWAInstall()
  
  const { settings, isLoaded } = useSettings()
  // Unique ID for this instance to prevent channel name collisions when multiple sidebars mount (e.g. mobile carousel)
  const instanceId = useRef(Math.random().toString(36).substring(7))

  const fetchUserAndChats = useCallback(async (showSkeleton = false) => {
    if (!user) {
      if (!authLoading) {
        setChats([])
        setLoading(false)
        setIsInitialLoading(false)
      }
      return
    }
    
    // Only show skeleton on first load, not on background refreshes
    if (showSkeleton) setLoading(true)
    try {
      const chatData = await api.get('/chats')


      if (!chatData || !Array.isArray(chatData)) {
        setChats([])
        setIsInitialLoading(false)
        return
      }

      const formattedChats = chatData.map((chat: any) => {
        const chatMembers = chat.members || []
        const otherMember = chat.is_group ? null : chatMembers.find((m: any) => m.id !== user.id)
        
        // Handle names and avatars
        let displayName = chat.is_group ? (chat.name || 'Group') : (otherMember?.name || 'Chat')
        if (!chat.is_group && otherMember?.id) {
          const savedNickname = localStorage.getItem(`nickname_${otherMember.id}`)
          if (savedNickname) displayName = savedNickname
        }

        const lastMsg = chat.last_message
        let lastMsgContent = lastMsg?.content || ''
        
        if (!lastMsgContent && lastMsg?.media_url) {
          if (lastMsg.media_type === 'image') lastMsgContent = '📷 Image'
          else if (lastMsg.media_type === 'video') lastMsgContent = '🎥 Video'
          else if (lastMsg.media_type === 'audio') lastMsgContent = '🎵 Audio'
          else lastMsgContent = '📎 Attachment'
        }
        
        if (!lastMsgContent) lastMsgContent = 'No messages yet'
        const lastMsgTime = lastMsg?.created_at || ''

        let lastTime = ''
        if (lastMsgTime) {
          const date = new Date(lastMsgTime)
          const now = new Date()
          if (date.toDateString() === now.toDateString()) {
            lastTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          } else {
            const yesterday = new Date(now)
            yesterday.setDate(yesterday.getDate() - 1)
            lastTime = date.toDateString() === yesterday.toDateString() ? 'Yesterday' : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
          }
        }

        return {
          id: chat.id,
          is_group: chat.is_group,
          display_name: displayName,
          display_avatar: chat.is_group ? chat.avatar_url : otherMember?.avatar_url,
          description: chat.description,
          group_members: chat.is_group ? chatMembers : [],
          other_profile: otherMember,
          unread_count: Number(chat.unread_count) || 0,
          last_message: lastMsgContent,
          last_time: lastTime || 'Now',
          last_msg_time: lastMsgTime,
          cover_url: chat.cover_url
        }
      })

      // Sort by last message time
      formattedChats.sort((a: any, b: any) => (b.last_msg_time || '').localeCompare(a.last_msg_time || ''))
      
      setChats(formattedChats)

      // Seed online status from fresh API data
      const freshOnlineIds = new Set<string>()
      formattedChats.forEach((c: any) => {
        if (c.other_profile && c.other_profile.status === 'online') {
          freshOnlineIds.add(c.other_profile.id)
        }
      })
      if (freshOnlineIds.size > 0) {
        setOnlineUserIds(prev => {
          const merged = new Set(prev)
          freshOnlineIds.forEach(id => merged.add(id))
          return merged
        })
      }

      if (user?.id) {
        localStorage.setItem(`chats_${user.id}`, JSON.stringify(formattedChats))
      }
      setIsInitialLoading(false)
    } catch (err) {
      console.error('[ChatSidebar] Fetch chats error:', err)
      setIsInitialLoading(false)
    } finally {
      setLoading(false)
    }
  }, [user, authLoading])

  const userIdRef = useRef<string | null>(null)
  const pendingBatchDelivered = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fetchRef = useRef<any>(null)

  useEffect(() => {
    userIdRef.current = user?.id || null
    fetchRef.current = fetchUserAndChats
  }, [user, fetchUserAndChats])

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const formatDateTime = () => {
    return {
      day: currentTime.toLocaleDateString('en-US', { day: '2-digit' }),
      month: currentTime.toLocaleDateString('en-US', { month: '2-digit' }),
      weekday: currentTime.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      hours: currentTime.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true }).split(' ')[0],
      minutes: currentTime.toLocaleTimeString('en-US', { minute: '2-digit' }).padStart(2, '0'),
      seconds: currentTime.toLocaleTimeString('en-US', { second: '2-digit' }).padStart(2, '0'),
      ampm: currentTime.toLocaleTimeString('en-US', { hour12: true }).slice(-2)
    }
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Real-time presence tracking for online dots
  useEffect(() => {
    if (!user?.id) return
    const socket = socketService.getSocket()
    const handlePresenceUpdate = ({ userId, status }: { userId: string, status: string }) => {
      setOnlineUserIds(prev => {
        const next = new Set(prev)
        if (status === 'online') {
          next.add(userId)
        } else {
          next.delete(userId)
        }
        return next
      })
    }
    socket.on('presence_update', handlePresenceUpdate)
    return () => {
      socket.off('presence_update', handlePresenceUpdate)
    }
  }, [user?.id])

  useEffect(() => {
    // Fail-safe to hide skeletons after 8 seconds
    const timeoutId = setTimeout(() => {
      setLoading(false)
      setIsInitialLoading(false)
    }, 8000)

    if (user && chats === null) {
      try {
        const cached = localStorage.getItem(`chats_${user.id}`)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Check if at least one group has cover_url field (even if null) to verify schema version
            const hasNewSchema = parsed.some(c => c.is_group && 'cover_url' in c)
            if (hasNewSchema) {
              setChats(parsed)
              setLoading(false)
              setIsInitialLoading(false)
            } else {
              // Old schema, clear it and force fetch
              localStorage.removeItem(`chats_${user.id}`)
            }
          }
        }
      } catch (e) {
        console.error('Cache load error:', e)
      }
    }

    return () => clearTimeout(timeoutId)
  }, [user, activeTab])

  useEffect(() => {
    const handleChatUpdated = (e: any) => {
      const updatedChat = e.detail
      setChats(prev => (prev || []).map(c => 
        c.id === updatedChat.id 
          ? { 
              ...c, 
              display_name: updatedChat.name, 
              description: updatedChat.description, 
              display_avatar: updatedChat.avatar_url || c.display_avatar,
              cover_url: updatedChat.cover_url || c.cover_url
            }
          : c
      ))
    }

    const handleAppRefresh = () => {
      fetchUserAndChats(false)
    }
    
    window.addEventListener('chat-updated', handleChatUpdated)
    window.addEventListener('app:refresh', handleAppRefresh)
    return () => {
      window.removeEventListener('chat-updated', handleChatUpdated)
      window.removeEventListener('app:refresh', handleAppRefresh)
    }
  }, [])

  const joinedRoomsRef = useRef<Set<string>>(new Set())
  const chatsRef = useRef<any[] | null>(null)
  const activeChatIdRef = useRef<string | undefined>(undefined)
  const markDeliveredTimer = useRef<NodeJS.Timeout | null>(null)

  // Keep refs in sync without causing re-registrations
  useEffect(() => { chatsRef.current = chats }, [chats])
  useEffect(() => { activeChatIdRef.current = activeChatId }, [activeChatId])

  // Join new chat rooms whenever chats list changes (separate from the message handler)
  useEffect(() => {
    if (!user?.id || !chats || chats.length === 0) return
    const socket = socketService.getSocket()
    chats.forEach(c => {
      if (!joinedRoomsRef.current.has(c.id)) {
        socket.emit('join_chat', c.id)
        joinedRoomsRef.current.add(c.id)
      }
    })
  }, [user?.id, chats])

  // Real-time unread badge — registered ONCE, uses refs to avoid re-registration
  useEffect(() => {
    if (!user?.id) return
    const socket = socketService.getSocket()

    const handleNewMessage = (payload: any) => {
      const incomingChatId = payload.chat_id || payload.chatId
      if (!incomingChatId) return

      // If the message is from someone else, acknowledge delivery immediately
      if (payload.sender_id !== user.id) {
        socket.emit('chat_read', { chatId: incomingChatId, readerId: user.id, status: 'delivered' })
        // Debounced mark-delivered: batch multiple rapid messages into one API call
        if (markDeliveredTimer.current) clearTimeout(markDeliveredTimer.current)
        markDeliveredTimer.current = setTimeout(() => {
          api.post('/messages/mark-delivered', {}).catch(() => {})
        }, 1500)
      }

      // Increment unread badge for non-active chats
      if (payload.sender_id !== user.id && incomingChatId !== activeChatIdRef.current) {
        setChats(prev => (prev || []).map(c =>
          c.id === incomingChatId
            ? {
                ...c,
                unread_count: (c.unread_count || 0) + 1,
                last_message: payload.content || c.last_message,
                last_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            : c
        ))
      }
    }
    socket.on('new_message', handleNewMessage)
    return () => {
      socket.off('new_message', handleNewMessage)
      if (markDeliveredTimer.current) clearTimeout(markDeliveredTimer.current)
    }
  }, [user?.id])

  // Clear unread count when a chat is opened
  useEffect(() => {
    if (!activeChatId) return
    setChats(prev => (prev || []).map(c =>
      c.id === activeChatId ? { ...c, unread_count: 0 } : c
    ))
  }, [activeChatId])

  // Debounced fetch: prevents stacking 10+ simultaneous fetches when many events fire
  fetchRef.current = fetchUserAndChats

  const debouncedFetch = useCallback(() => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
    // Always background refresh (false) when triggered by realtime events
    fetchTimerRef.current = setTimeout(() => fetchRef.current(false), 400)
  }, [])

  userIdRef.current = user?.id || null

  useEffect(() => {
    if (!user) {
      if (!authLoading) {
        setChats([])
        setLoading(false)
      }
      return
    }

    // Refresh chats when user changes or tab switches to groups (to ensure fresh schema)
    const hasData = chats && chats.length > 0
    const shouldFreshFetch = !hasData || activeTab === 'groups'
    fetchUserAndChats(shouldFreshFetch && !hasData)

    // Safety timeout: never stay stuck in loading for more than 8 seconds
    loadingTimeoutRef.current = setTimeout(() => {
      setLoading(false)
    }, 8000)

    // Transitioned to "Fake Realtime" Polling for sidebar updates
    let syncIntervalId: NodeJS.Timeout

    const startSync = () => {
      const isIdle = document.visibilityState === 'hidden'
      const interval = isIdle ? 120000 : 30000 // 30s active / 120s idle
      
      syncIntervalId = setInterval(() => {
        fetchUserAndChats(false)
      }, interval)
    }

    startSync()

    const handleVisibilityChange = () => {
      clearInterval(syncIntervalId)
      if (document.visibilityState === 'visible') {
        fetchUserAndChats(false)
      }
      startSync()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Clock — update every 60s (minute precision is enough for the header)
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)


    // Add storage event listener to refresh nicknames if changed in other tabs/components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('nickname_')) {
        // Refresh local state to reflect new nickname
        fetchUserAndChats(false)
      }
    }
    window.addEventListener('storage', handleStorageChange)

    return () => { 
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(clockInterval)
      clearInterval(syncIntervalId)
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current)
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current)
    }
  }, [user?.id, authLoading])

  // Instant Sidebar Updates via Broadcast Pings
  useNotify(() => {
    // When we get a ping, trigger a debounced fetch to update unread counts/order
    debouncedFetch()
  })

  const handleLogout = async () => {
    if (user) {
      try {
        await api.put('/profiles/update', { status: 'offline' })
      } catch (err) {
        console.warn('[ChatSidebar] Failed to set offline status on logout')
      }
    }
    await signOut()
    window.location.href = '/login'
  }

  const filteredChats = useMemo(() => chats ? chats.filter((c: any) => {
    const matchesSearch = (c.display_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
                         (c.display_email?.toLowerCase() || '').includes(search.toLowerCase())
    
    if (activeTab === 'chat') return matchesSearch && !c.is_group
    if (activeTab === 'groups' && groupSubTab === 'my') return matchesSearch && c.is_group
    
    return false // Community tab handled separately
  }) : [], [chats, search, activeTab, groupSubTab])

  // Deduplicate DMs to ensure only the most recent chat with the same user is shown
  const deduplicatedChats = useMemo(() => filteredChats.reduce((acc: any[], current: any) => {
    if (current.is_group) {
      acc.push(current)
      return acc
    }
    
    const otherId = current.other_profile?.id
    if (!otherId) {
      acc.push(current)
      return acc
    }

    const existingIndex = acc.findIndex(c => !c.is_group && c.other_profile?.id === otherId)
    if (existingIndex === -1) {
      acc.push(current)
    } else {
      // If current is newer than existing, replace it
      const existing = acc[existingIndex]
      if ((current.last_msg_time || '') > (existing.last_msg_time || '')) {
        acc[existingIndex] = current
      }
    }
    return acc
  }, []), [filteredChats])

  const textSizeClass = settings.textSize === 'small' ? 'text-sm' : settings.textSize === 'large' ? 'text-lg' : 'text-base'
  const rawAvatarSrc = authProfile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const avatarSource = imageError ? null : rawAvatarSrc

  // Reset image error if the source URL changes (e.g. user updates profile)
  useEffect(() => {
    setImageError(false)
  }, [rawAvatarSrc])

  return (
    <div className="w-full flex flex-col border-r border-white/[0.04] h-full shrink-0 relative transition-all bg-[#000] overflow-hidden min-w-0">

      <div className="h-[60px] bg-[#0a0a0a] flex items-center justify-between px-4 sticky top-0 z-10 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenProfile}>
            {avatarSource ? (
              <img 
                src={avatarSource} 
                alt="Profile" 
                onError={() => setImageError(true)}
                className="w-10 h-10 rounded-full hover:opacity-80 transition-opacity border border-white/[0.08] object-cover" 
              />
            ) : (
              <UserCircle className="w-10 h-10 text-zinc-600 cursor-pointer" />
            )}
          </div>
          <div className="flex flex-col">
            <h2 className="text-zinc-500 text-[11px] font-medium tracking-tight leading-tight">
              {getGreeting()}
            </h2>
            <span className="text-white text-[14px] font-bold">
              {authProfile?.name || user?.user_metadata?.full_name || 'User'}
            </span>
          </div>
        </div>

        {isMounted && (
          <>
            <div className="flex md:hidden flex-col items-center min-w-[120px]">
              <div className="flex items-center gap-1.5 text-zinc-600 text-[10px] font-mono font-bold tracking-widest border-b border-white/[0.04] pb-1 mb-1 w-full justify-center">
                <span>{formatDateTime().day}</span>
                <span className="opacity-30">.</span>
                <span>{formatDateTime().month}</span>
                <span className="opacity-30">.</span>
                <span className="text-zinc-500">{formatDateTime().weekday}</span>
              </div>
              
              <div className="flex items-baseline gap-1">
                <div className="text-white text-[18px] font-mono font-black tracking-[-0.1em] tabular-nums flex items-baseline">
                  {formatDateTime().hours}
                  <span className="mx-0.5 opacity-30">:</span>
                  {formatDateTime().minutes}
                  <span className="text-[13px] opacity-20 ml-1">.{formatDateTime().seconds}</span>
                </div>
                <div className="text-zinc-600 text-[9px] font-mono font-bold uppercase ml-1">
                  {formatDateTime().ampm}
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
            <button 
              onClick={() => onTabChange('chat')}
              className={`p-2 rounded-full transition-all duration-300 ${activeTab === 'chat' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}
              title="Direct Messages"
            >
              <Home className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onTabChange('groups')}
              className={`p-2 rounded-full transition-all duration-300 ${activeTab === 'groups' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}
              title="Group Communities"
            >
              <Users className="w-4 h-4" />
            </button>
            <button 
              onClick={onOpenNewChat}
              className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-all duration-300"
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onTabChange('feed')}
              className={`p-2 rounded-full transition-all duration-300 ${activeTab === 'feed' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}
              title="Discovery Feed"
            >
              <Compass className="w-4 h-4" />
            </button>
              <button 
                onClick={() => onTabChange('initiative')}
                className={`p-2 rounded-full transition-all duration-300 ${activeTab === 'initiative' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}
                title="Initiatives"
              >
                <CircleDashed className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onTabChange('jobs')}
                className={`p-2 rounded-full transition-all duration-300 ${activeTab === 'jobs' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}
                title="Job Opportunities"
              >
                <Briefcase className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onTabChange('challenges')}
                className={`p-2 rounded-full transition-all duration-300 ${activeTab === 'challenges' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}
                title="Connectly Challenges"
              >
                <Trophy className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="p-3 bg-black/60 border-b border-white/[0.04] space-y-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-600"><Search className="h-4 w-4" /></div>
          <input type="text" placeholder={activeTab === 'groups' ? "Search for communities..." : "Search or start new chat"} className="block w-full pl-10 pr-3 py-2 bg-white/[0.03] border border-white/[0.04] text-white rounded-xl focus:ring-1 focus:ring-white/10 text-sm placeholder-zinc-700 outline-none transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {activeTab === 'groups' && (
          <div className="flex bg-white/[0.03] p-1 rounded-lg border border-white/[0.04]">
            <button 
              onClick={() => setGroupSubTab('my')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[11px] font-bold rounded-md transition-all ${groupSubTab === 'my' ? 'bg-white/[0.08] text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Users className="w-3 h-3" />
              My Groups
            </button>
            <button 
              onClick={() => setGroupSubTab('community')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[11px] font-bold rounded-md transition-all ${groupSubTab === 'community' ? 'bg-white/[0.08] text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Globe className="w-3 h-3" />
              Community
            </button>
          </div>
        )}
      </div>


      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-0">
        {activeTab === 'groups' && groupSubTab === 'community' ? (
          <GroupDiscovery currentUserId={user?.id || ''} onSelectChat={onSelectChat} />
        ) : (loading && isInitialLoading && (!chats || chats.length === 0)) || authLoading ? (
          <div className="flex flex-col">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center px-4 py-3 border-b border-white/[0.03] animate-pulse">
                <div className="w-11 h-11 rounded-full bg-white/[0.04] shrink-0 mr-3 animate-skeleton"></div>
                <div className="flex-1 min-w-0 pr-2">
                  <div className="h-3.5 w-1/3 bg-white/[0.04] rounded mb-2 animate-skeleton"></div>
                  <div className="h-3 w-3/4 bg-white/[0.04] rounded animate-skeleton"></div>
                </div>
              </div>
            ))}
          </div>
        ) : deduplicatedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <p className="text-zinc-700 text-sm">{search ? 'No conversations found.' : 'No chats yet. Tap + to start.'}</p>
          </div>
        ) : (
          <div className={activeTab === 'groups' ? "flex flex-col gap-5 p-4" : ""}>
            {deduplicatedChats.map((chat) => {
              if (activeTab === 'groups') {
                const memberProfiles = chat.group_members || []
                const displayMembers = memberProfiles.slice(0, 4)
                const extra = Math.max(0, memberProfiles.length - 4)

                // Deterministic theme per group name
                const GROUP_THEMES_MY = [
                  { gradient: 'from-[#667eea] to-[#764ba2]', accent: '#667eea' },
                  { gradient: 'from-[#f093fb] to-[#f5576c]', accent: '#f093fb' },
                  { gradient: 'from-[#4facfe] to-[#00f2fe]', accent: '#4facfe' },
                  { gradient: 'from-[#43e97b] to-[#38f9d7]', accent: '#43e97b' },
                  { gradient: 'from-[#fa709a] to-[#fee140]', accent: '#fa709a' },
                  { gradient: 'from-[#a18cd1] to-[#fbc2eb]', accent: '#a18cd1' },
                ]
                let hash = 0
                for (let i = 0; i < (chat.display_name || '').length; i++) hash = (chat.display_name || '').charCodeAt(i) + ((hash << 5) - hash)
                const theme = GROUP_THEMES_MY[Math.abs(hash) % GROUP_THEMES_MY.length]

                return (
                  <div
                    key={chat.id}
                    className="rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0d0d0f] hover:border-white/[0.14] transition-all duration-300 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.4)] active:scale-[0.98]"
                    onClick={() => onSelectChat(chat.id, { name: chat.display_name, avatar: chat.display_avatar, isGroup: true })}
                  >
                    {/* Banner */}
                    <div className={`relative h-[68px] ${chat.cover_url ? '' : 'bg-[#1a1a1c]'} overflow-hidden`}>
                      {!chat.cover_url && (
                        <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-5`} />
                      )}
                      
                      {chat.cover_url ? (
                         <img src={chat.cover_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                          <Users className="w-12 h-12 text-white" />
                        </div>
                      )}
                      
                      {/* Gradient overlay for readability when image is present */}
                      {chat.cover_url && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      )}
                      {/* Group icon */}
                      <div className="absolute bottom-[-18px] left-4">
                        <div
                          className="w-[44px] h-[44px] rounded-xl border-[3px] border-[#0d0d0f] overflow-hidden shadow-xl flex items-center justify-center bg-zinc-800"
                        >
                          {chat.display_avatar ? (
                            <img src={chat.display_avatar} className="w-full h-full object-cover" alt={chat.display_name} />
                          ) : (
                            <span className="text-white font-black text-[15px]">{chat.display_name?.[0] || '#'}</span>
                          )}
                        </div>
                      </div>
                      {/* Unread badge */}
                      {chat.unread_count > 0 && (
                        <div className="absolute top-2.5 right-3 min-w-[20px] h-5 px-1.5 bg-[#10b981] rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white text-[10px] font-black">{chat.unread_count > 99 ? '99+' : chat.unread_count}</span>
                        </div>
                      )}
                      {/* Timestamp */}
                      <div className="absolute bottom-2 right-3">
                        <span className="text-[10px] text-white/50 font-medium">{chat.last_time}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="pt-6 px-4 pb-3.5">
                      <h3 className="text-[14px] font-black text-white tracking-tight truncate mb-1">{chat.display_name}</h3>
                      <p className="text-[12px] text-zinc-600 truncate leading-tight mb-3">{chat.last_message || 'No messages yet'}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-2">
                          {displayMembers.length > 0 ? displayMembers.map((p: any, i: number) => (
                            <div key={i} className="w-6 h-6 rounded-full border-[2px] border-[#0d0d0f] overflow-hidden flex items-center justify-center shrink-0" style={{ zIndex: 10 - i, background: theme.accent + '44' }}>
                              {p?.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="text-[7px] font-black text-white/60">{p?.name?.[0] || '?'}</span>}
                            </div>
                          )) : (
                            <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center"><Users className="w-3 h-3 text-zinc-600" /></div>
                          )}
                          {extra > 0 && (
                            <div className="w-6 h-6 rounded-full border-[2px] border-[#0d0d0f] bg-white/[0.06] flex items-center justify-center z-0">
                              <span className="text-[7px] font-black text-zinc-500">+{extra}</span>
                            </div>
                          )}
                        </div>
                        <div className={`text-[10px] font-black px-3 py-1 rounded-full bg-gradient-to-r ${theme.gradient} text-white shadow`}>
                          Open →
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }

              return (
                <div key={chat.id} onClick={() => onSelectChat(chat.id, { name: chat.display_name, avatar: chat.display_avatar, isGroup: chat.is_group })}
                  className={`group flex items-center px-4 py-3 cursor-pointer transition-all duration-150 border-b border-white/[0.03] ${activeChatId === chat.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}>
                  
                  <div className="relative w-11 h-11 shrink-0 mr-3">
                    <div className="w-11 h-11 rounded-full bg-white/[0.05] flex items-center justify-center overflow-hidden">
                      {chat.display_avatar ? (
                        <img src={chat.display_avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <div className="w-full h-full bg-white/[0.08] flex items-center justify-center text-zinc-400 font-bold uppercase text-base">
                          {chat.display_name?.[0] || '?'}
                        </div>
                      )}
                    </div>
                    {chat.other_profile && !chat.is_group && (onlineUserIds.has(chat.other_profile.id) || chat.other_profile.status === 'online') && chat.other_profile?.availability_status !== false && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#22c55e] rounded-full border-2 border-[#0e0e0e] shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h3 className={`${textSizeClass} font-medium truncate leading-tight flex items-center gap-1.5 ${activeChatId === chat.id ? 'text-white' : 'text-zinc-200'}`}>
                        {chat.display_name}
                        {chat.other_profile?.role === 'professional' && chat.other_profile?.availability_status === false && (
                          <span className="text-[9px] bg-white/[0.06] text-zinc-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Away</span>
                        )}
                      </h3>
                      <span className={`text-[11px] whitespace-nowrap shrink-0 ${chat.unread_count > 0 ? 'text-white font-bold' : 'text-zinc-600'}`}>
                        {chat.last_time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-zinc-500 text-sm truncate leading-tight flex-1">{chat.last_message}</p>
                      {chat.unread_count > 0 && (
                         <div className="min-w-[19px] h-[19px] px-1.5 bg-[#10b981] rounded-full flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                          <span className="text-white text-[10px] font-bold">{chat.unread_count > 99 ? '99+' : chat.unread_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button for New Chat (Mobile) */}
      <div className={`absolute bottom-24 right-5 z-[90] md:hidden transition-all duration-300 ${isModalOpen ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}>
        <button
          onClick={onOpenNewChat}
          className="w-14 h-14 bg-[#1e1e1e] rounded-full flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/[0.08] hover:bg-[#2a2a2a] hover:scale-105 active:scale-95 transition-all text-white"
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>
      </div>

    </div>
  )
}
