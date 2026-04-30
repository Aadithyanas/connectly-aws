'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Settings, X, Play, Image as ImageIcon, Send, Loader2, ChevronLeft, Flame } from 'lucide-react'
import Image from 'next/image'
import { useStatuses, Status } from '@/hooks/useStatuses'
import { useSettings } from '@/hooks/useSettings'
import StatusPrivacyModal from './StatusPrivacyModal'
import { useAuth } from '@/context/AuthContext'

interface StatusTabProps {
  onStatusClick: (statuses: Status[]) => void
  onBack?: () => void
}

// Instagram-style gradient ring colors
const RING_GRADIENTS = [
  'from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]',
  'from-[#833ab4] via-[#fd1d1d] to-[#fcb045]',
  'from-[#405de6] via-[#5851db] to-[#833ab4]',
  'from-[#12c2e9] via-[#c471ed] to-[#f64f59]',
  'from-[#a1c4fd] via-[#c2e9fb] to-[#a1c4fd]',
]

function StoryRing({ index = 0, active = true, size = 'md', children }: {
  index?: number
  active?: boolean
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}) {
  const sizeMap = { sm: 'w-[58px] h-[58px]', md: 'w-[68px] h-[68px]', lg: 'w-[80px] h-[80px]' }
  const innerMap = { sm: 'p-[2.5px]', md: 'p-[2.5px]', lg: 'p-[3px]' }
  const gradient = RING_GRADIENTS[index % RING_GRADIENTS.length]

  return (
    <div className={`${sizeMap[size]} rounded-full ${active ? `bg-gradient-to-br ${gradient}` : 'bg-zinc-700/60 border border-zinc-600/40'} ${innerMap[size]} flex items-center justify-center shrink-0`}>
      <div className="w-full h-full rounded-full bg-black overflow-hidden flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

export default function StatusTab({ onStatusClick, onBack }: StatusTabProps) {
  const { myStatuses, partnerStatuses, loading, uploadStatus, refresh } = useStatuses()
  const { settings } = useSettings()
  const { profile, user } = useAuth()
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Seen tracking (Instagram style: gray ring after viewing) ───
  const SEEN_KEY = `seen_stories_${user?.id}`
  const [seenUserIds, setSeenUserIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`seen_stories_${user?.id}`)
      return new Set(stored ? JSON.parse(stored) : [])
    } catch { return new Set() }
  })

  // Reload seen set when user changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEEN_KEY)
      setSeenUserIds(new Set(stored ? JSON.parse(stored) : []))
    } catch { setSeenUserIds(new Set()) }
  }, [user?.id])

  // Mark a user's stories as seen and turn their ring gray
  const markSeen = (userId: string) => {
    setSeenUserIds(prev => {
      const next = new Set(prev)
      next.add(userId)
      try { localStorage.setItem(SEEN_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  // Check if any story from a user was posted AFTER we last marked them seen
  // (so new stories re-activate the ring)
  const isUnseen = (userId: string, statuses: Status[]) => {
    if (!seenUserIds.has(userId)) return true
    // If there's a newer story since last seen, treat as unseen
    const stored = localStorage.getItem(`seen_ts_${userId}_${user?.id}`)
    if (!stored) return true
    const latestTs = Math.max(...statuses.map(s => new Date(s.created_at).getTime()))
    return latestTs > parseInt(stored, 10)
  }

  const handleStoryClick = (userId: string, statuses: Status[]) => {
    // Record timestamp of latest story at time of viewing
    const latestTs = Math.max(...statuses.map(s => new Date(s.created_at).getTime()))
    try { localStorage.setItem(`seen_ts_${userId}_${user?.id}`, String(latestTs)) } catch {}
    markSeen(userId)
    onStatusClick(statuses)
  }

  const partnerEntries = Object.entries(partnerStatuses)

  const myAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const myName = profile?.name || user?.user_metadata?.full_name || 'Me'

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    const res = await uploadStatus(selectedFile, caption)
    setIsUploading(false)
    if (res?.success) {
      setSelectedFile(null)
      setCaption('')
      if (refresh) refresh()
    }
  }


  return (
    <div className="flex flex-col h-full bg-[#000] w-full min-w-0 overflow-hidden relative">

      {/* Header */}
      <div className="w-full h-[60px] flex items-center justify-between px-5 bg-[#000]/80 backdrop-blur-xl text-white shrink-0 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-1.5 hover:bg-white/[0.06] rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-zinc-400" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <h2 className="text-[15px] font-bold tracking-tight">Initiative</h2>
          </div>
        </div>
        <button
          onClick={() => setIsPrivacyOpen(true)}
          className="p-2 hover:bg-white/[0.06] rounded-full transition-colors text-zinc-500 hover:text-white"
          title="Initiative Privacy"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto w-full" style={{ scrollbarWidth: 'none' }}>

        {/* ─── Stories Row (Instagram-style horizontal scroll) ─── */}
        <div className="pt-5 pb-3 border-b border-white/[0.04]">
          <div className="flex items-flex-start gap-4 px-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>

            {/* My Story Bubble */}
            <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              onClick={() => myStatuses.length > 0 ? onStatusClick(myStatuses) : fileInputRef.current?.click()}
            >
              <div className="relative">
                <StoryRing index={0} active={false} size="md">
                  {myStatuses.length > 0 ? (
                    myStatuses[0].content_type === 'video' ? (
                      <video src={myStatuses[0].content_url} muted className="w-full h-full object-cover" />
                    ) : (
                      <img src={myStatuses[0].content_url} alt="My Initiative" className="w-full h-full object-cover" />
                    )
                  ) : myAvatar ? (
                    <img src={myAvatar} alt="Me" className="w-full h-full object-cover grayscale-0" />
                  ) : (
                    <div className="w-full h-full bg-white/[0.05] flex items-center justify-center text-white font-bold text-lg">
                      {myName[0]}
                    </div>
                  )}
                </StoryRing>
                {/* Plus Badge */}
                <label
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center border-[2px] border-black cursor-pointer hover:bg-[#1aa3ff] transition-colors z-10 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="w-3 h-3 text-white" strokeWidth={3} />
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
                </label>
              </div>
              <span className="text-[11px] text-white font-medium max-w-[62px] truncate text-center leading-tight">Your story</span>
            </div>

            {/* Partners' Story Bubbles */}
            {partnerEntries.map(([userId, userStatuses], i) => {
              const u = userStatuses[0]?.user
              const unseen = isUnseen(userId, userStatuses)
              return (
                <div
                  key={userId}
                  className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group active:scale-95 transition-transform"
                  onClick={() => handleStoryClick(userId, userStatuses)}
                >
                  <div className="relative">
                    <StoryRing index={i + 1} active={unseen} size="md">
                      {u?.avatar_url ? (
                        <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white font-bold text-lg">
                          {u?.name?.[0] || '?'}
                        </div>
                      )}
                    </StoryRing>
                    {/* Unseen count dot — only show when there are unseen stories */}
                    {unseen && userStatuses.length > 1 && (
                      <div className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#0095f6] rounded-full flex items-center justify-center px-0.5 border border-black z-10 shadow-md">
                        <span className="text-[9px] text-white font-black">{userStatuses.length}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[11px] font-medium max-w-[62px] truncate text-center leading-tight ${unseen ? 'text-white' : 'text-zinc-500'}`}>{u?.name?.split(' ')[0] || 'User'}</span>
                </div>
              )
            })}

            {/* Empty state ghost bubbles */}
            {partnerEntries.length === 0 && !loading && [0, 1, 2].map(i => (
              <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 opacity-20">
                <div className="w-[68px] h-[68px] rounded-full bg-white/[0.04] border border-white/[0.06]" />
                <div className="h-2 w-10 bg-white/[0.06] rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* ─── Recent Initiatives Grid ─── */}
        <div className="px-4 pt-5 pb-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.12em]">Recent Initiatives</h3>
            {partnerEntries.length > 0 && (
              <span className="text-[10px] text-zinc-700 font-bold">{partnerEntries.length} active</span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-white/[0.03] animate-pulse border border-white/[0.03]" />
              ))}
            </div>
          ) : partnerEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                <Flame className="w-7 h-7 text-zinc-700" />
              </div>
              <div className="text-center">
                <p className="text-zinc-500 text-sm font-semibold">No initiatives yet</p>
                <p className="text-zinc-700 text-xs mt-1">When your connections share, they'll appear here.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {partnerEntries.map(([userId, userStatuses], i) => {
                const u = userStatuses[0]?.user
                const media = userStatuses[0]
                const isVideo = media?.content_type === 'video'
                const unseen = isUnseen(userId, userStatuses)

                return (
                  <div
                    key={userId}
                    className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer group active:scale-[0.97] transition-all ${unseen ? '' : 'opacity-60'}`}
                    onClick={() => handleStoryClick(userId, userStatuses)}
                  >
                    {/* Media */}
                    {isVideo ? (
                      <video src={media.content_url} muted loop className="w-full h-full object-cover" />
                    ) : (
                      <img src={media.content_url} alt="Initiative" className="w-full h-full object-cover" />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                    {/* Avatar ring — gradient if unseen, gray if seen */}
                    <div className="absolute top-2.5 left-2.5">
                      <div className={`w-9 h-9 rounded-full p-[2px] shadow-lg ${unseen ? `bg-gradient-to-br ${RING_GRADIENTS[i % RING_GRADIENTS.length]}` : 'bg-zinc-600'}`}>
                        <div className="w-full h-full rounded-full overflow-hidden bg-[#111]">
                          {u?.avatar_url ? (
                            <img src={u.avatar_url} alt={u?.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white font-bold text-xs">
                              {u?.name?.[0] || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Video indicator */}
                    {isVideo && (
                      <div className="absolute top-2.5 right-2.5">
                        <div className="w-6 h-6 bg-black/50 rounded-full flex items-center justify-center">
                          <Play className="w-3 h-3 text-white fill-white" />
                        </div>
                      </div>
                    )}

                    {/* Count badge — only when unseen */}
                    {unseen && userStatuses.length > 1 && (
                      <div className="absolute top-2.5 right-2.5 min-w-[20px] h-5 bg-[#0095f6] rounded-full flex items-center justify-center px-1.5">
                        <span className="text-[9px] text-white font-black">{userStatuses.length}</span>
                      </div>
                    )}

                    {/* Name + time */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <p className="text-white text-[12px] font-bold truncate leading-tight">{u?.name?.split(' ')[0] || 'User'}</p>
                      <p className="text-white/50 text-[10px]">
                        {new Date(media.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Preview Overlay */}
      {selectedFile && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col">
          <div className="p-4 flex items-center justify-between text-white bg-black/70 backdrop-blur-xl border-b border-white/[0.06]">
            <button onClick={() => setSelectedFile(null)} className="p-2 hover:bg-white/[0.08] rounded-full transition-colors">
              <X className="w-5 h-5 text-zinc-300" />
            </button>
            <span className="font-bold text-[15px] tracking-tight">New Initiative</span>
            <div className="w-10" />
          </div>

          <div className="flex-1 min-h-0 relative flex items-center justify-center overflow-hidden bg-[#070707]">
            {selectedFile.type.startsWith('video') ? (
              <video src={URL.createObjectURL(selectedFile)} controls className="max-w-full max-h-full rounded-3xl shadow-2xl z-10 object-contain" />
            ) : (
              <>
                <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="max-w-full max-h-full object-contain z-10 rounded-3xl shadow-2xl" />
                <img src={URL.createObjectURL(selectedFile)} alt="" className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20 scale-110 pointer-events-none" />
              </>
            )}
          </div>

          <div className="p-4 pt-3 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/[0.06] z-20">
            <div className="flex items-center gap-3 max-w-4xl mx-auto w-full">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Add a caption..."
                  autoFocus
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-2xl py-3 pl-4 pr-4 focus:ring-1 focus:ring-[#ee2a7b]/50 text-sm outline-none placeholder-zinc-600 transition-all"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-12 h-12 bg-[#0095f6] hover:bg-[#1aa3ff] rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 shadow-lg shrink-0"
              >
                {isUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPrivacyOpen && <StatusPrivacyModal onClose={() => setIsPrivacyOpen(false)} />}
    </div>
  )
}
