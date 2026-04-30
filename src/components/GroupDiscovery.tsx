'use client'

import { useState, useEffect } from 'react'
import { Globe, Users, Loader2, Sparkles, Zap, TrendingUp, Lock, Hash } from 'lucide-react'

interface GroupDiscoveryProps {
  onSelectChat: (chatId: string, metadata?: { name: string, avatar?: string, isGroup?: boolean }) => void
  currentUserId: string
}

// Deterministic gradient per group based on name hash
const GROUP_THEMES = [
  { gradient: 'from-[#667eea] to-[#764ba2]', accent: '#667eea', tag: 'bg-purple-500/20 text-purple-300 border-purple-500/20' },
  { gradient: 'from-[#f093fb] to-[#f5576c]', accent: '#f093fb', tag: 'bg-pink-500/20 text-pink-300 border-pink-500/20' },
  { gradient: 'from-[#4facfe] to-[#00f2fe]', accent: '#4facfe', tag: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/20' },
  { gradient: 'from-[#43e97b] to-[#38f9d7]', accent: '#43e97b', tag: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' },
  { gradient: 'from-[#fa709a] to-[#fee140]', accent: '#fa709a', tag: 'bg-orange-500/20 text-orange-300 border-orange-500/20' },
  { gradient: 'from-[#a18cd1] to-[#fbc2eb]', accent: '#a18cd1', tag: 'bg-violet-500/20 text-violet-300 border-violet-500/20' },
]

function getTheme(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return GROUP_THEMES[Math.abs(hash) % GROUP_THEMES.length]
}

function MemberAvatarStack({ members, theme }: { members: any[], theme: typeof GROUP_THEMES[0] }) {
  const display = members.slice(0, 4)
  const extra = Math.max(0, members.length - 4)
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2.5">
        {display.map((m: any, i: number) => {
          const avatar = m.profiles?.avatar_url || m.avatar_url
          return (
            <div
              key={i}
              className="w-7 h-7 rounded-full border-[2px] border-[#0d0d0f] overflow-hidden flex items-center justify-center shrink-0 shadow-lg"
              style={{ zIndex: 10 - i, background: `linear-gradient(135deg, ${theme.accent}55, ${theme.accent}22)` }}
            >
              {avatar ? (
                <img src={avatar} className="w-full h-full object-cover" alt="" onError={(e) => e.currentTarget.style.display = 'none'} />
              ) : (
                <span className="text-[8px] font-black text-white/70">{String.fromCharCode(65 + i)}</span>
              )}
            </div>
          )
        })}
        {extra > 0 && (
          <div className="w-7 h-7 rounded-full border-[2px] border-[#0d0d0f] bg-white/[0.06] flex items-center justify-center shrink-0 z-0">
            <span className="text-[9px] font-black text-white/60">+{extra}</span>
          </div>
        )}
      </div>
      <span className="text-[11px] text-zinc-500 font-medium">{members.length} member{members.length !== 1 ? 's' : ''}</span>
    </div>
  )
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4002'

export default function GroupDiscovery({ onSelectChat, currentUserId }: GroupDiscoveryProps) {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [requestingIds, setRequestingIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'popular' | 'new'>('all')

  useEffect(() => {
    const fetchPublicGroups = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_BASE}/api/chats/public`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        // Filter out groups the current user is already a member of
        const filtered = (data || []).filter((g: any) => !g.myStatus)
        setGroups(filtered)
      } catch (err) {
        console.error('Error fetching public groups:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPublicGroups()
  }, [currentUserId])

  const handleJoinRequest = async (chatId: string) => {
    setRequestingIds(prev => new Set(prev).add(chatId))
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/chats/${chatId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: 'requesting' })
      })
      if (res.ok) {
        setGroups(prev => prev.map(g => g.id === chatId ? { ...g, myStatus: 'requesting' } : g))
      }
    } catch (err) {
      console.error('Error requesting to join group:', err)
    } finally {
      setRequestingIds(prev => { const next = new Set(prev); next.delete(chatId); return next })
    }
  }

  const sorted = [...groups].sort((a, b) => {
    if (filter === 'popular') return (b.chat_members?.length || 0) - (a.chat_members?.length || 0)
    if (filter === 'new') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    return 0
  })

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.04]">
            <div className="h-[90px] bg-white/[0.04]" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-2/3 bg-white/[0.04] rounded-lg" />
              <div className="h-3 w-full bg-white/[0.03] rounded" />
              <div className="h-3 w-4/5 bg-white/[0.03] rounded" />
              <div className="h-10 bg-white/[0.03] rounded-xl mt-4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 px-6 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
          <Globe className="w-7 h-7 text-zinc-600" />
        </div>
        <div>
          <p className="text-zinc-400 font-semibold text-sm">No communities found</p>
          <p className="text-zinc-600 text-xs mt-1">Be the first to create one</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter Pills */}
      <div className="flex gap-2 px-4 pt-3 pb-2 shrink-0">
        {(['all', 'popular', 'new'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
              filter === f
                ? 'bg-white text-black shadow-lg'
                : 'bg-white/[0.04] text-zinc-500 hover:text-zinc-300 border border-white/[0.05]'
            }`}
          >
            {f === 'all' && <Globe className="w-3 h-3" />}
            {f === 'popular' && <TrendingUp className="w-3 h-3" />}
            {f === 'new' && <Sparkles className="w-3 h-3" />}
            {f}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3 pt-1" style={{ scrollbarWidth: 'none' }}>
        {sorted.map((group) => {
          const theme = getTheme(group.name || '')
          const members = group.chat_members || []
          const memberCount = members.length

          return (
            <div
              key={group.id}
              className="rounded-2xl overflow-hidden border border-white/[0.06] bg-[#0d0d0f] hover:border-white/[0.12] transition-all duration-300 group shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
            >
              {/* Banner */}
              <div className={`relative h-[120px] bg-gradient-to-r ${theme.gradient} overflow-hidden`}>
                {/* Render custom cover if available */}
                {group.cover_url ? (
                  <img src={group.cover_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 60%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.2) 0%, transparent 60%)'
                  }}>
                    <div className="w-full h-full opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />
                  </div>
                )}
                
                {/* Grid Pattern Overlay (only for default gradients) */}
                {!group.cover_url && (
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />
                )}

                {/* Gradient Overlay for text readability on images */}
                {group.cover_url && (
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                )}

                {/* Group icon / avatar */}
                <div className="absolute bottom-[-20px] left-4">
                  <div
                    className="w-[52px] h-[52px] rounded-xl border-[3px] border-[#0d0d0f] overflow-hidden shadow-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${theme.accent}, #000)` }}
                  >
                    {group.avatar_url ? (
                      <img src={group.avatar_url} className="w-full h-full object-cover" alt={group.name} />
                    ) : (
                      <Hash className="w-5 h-5 text-white/70" />
                    )}
                  </div>
                </div>
                {/* Live badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">Live</span>
                </div>
                {/* Member count chip */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full">
                  <Users className="w-2.5 h-2.5 text-white/70" />
                  <span className="text-[10px] text-white/80 font-bold">{memberCount}</span>
                </div>
              </div>

              {/* Content */}
              <div className="pt-7 px-4 pb-4">
                {/* Name + tag row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-[15px] font-black text-white tracking-tight leading-tight flex-1 min-w-0 truncate">
                    {group.name}
                  </h3>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${theme.tag}`}>
                    Community
                  </span>
                </div>

                {/* Description */}
                <p className="text-[12.5px] text-zinc-500 leading-relaxed line-clamp-2 mb-3">
                  {group.description || 'A space to connect, share ideas, and grow together.'}
                </p>

                {/* Member stack */}
                <div className="mb-4">
                  <MemberAvatarStack members={members} theme={theme} />
                </div>

                {/* CTA */}
                {group.myStatus === 'requesting' ? (
                  <div className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-500 text-[12px] font-bold flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
                    Request Pending
                  </div>
                ) : group.myStatus === 'invited' ? (
                  <button
                    onClick={() => onSelectChat(group.id, { name: group.name, avatar: group.avatar_url, isGroup: true })}
                    className="w-full py-2.5 rounded-xl bg-white text-black text-[12px] font-black tracking-tight hover:bg-zinc-200 transition-all active:scale-[0.98]"
                  >
                    Accept Invite →
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoinRequest(group.id)}
                    disabled={requestingIds.has(group.id)}
                    className={`w-full py-2.5 rounded-xl text-[12px] font-black tracking-tight transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-gradient-to-r ${theme.gradient} text-white shadow-lg hover:opacity-90 disabled:opacity-50`}
                  >
                    {requestingIds.has(group.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        Join Community
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
