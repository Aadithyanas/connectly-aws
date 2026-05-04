'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/utils/api'
import { X, Camera, Edit2, Check, User, Users, ShieldCheck, LogOut, Trash2, Mail, Info, Briefcase, GraduationCap, Globe, Link, Signal, Building2, BookOpen, Rocket, Play, Plus, Trophy, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useIsUserOnline } from '@/hooks/useOnlineStatus'
import { useAuth } from '@/context/AuthContext'
import { useConnections } from '@/hooks/useConnections'
import ConnectionsModal from './ConnectionsModal'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { useUserRank } from '@/hooks/useUserRank'
import { toast } from 'sonner'

interface InfoSidebarProps {
  isOpen: boolean
  onClose: () => void
  type: 'profile' | 'contact' | 'group'
  data?: any
  onViewPosts?: (userId: string) => void
}

export default function InfoSidebar({ isOpen, onClose, type, data, onViewPosts }: InfoSidebarProps) {
  const { isInstallable, installApp } = usePWAInstall()
  const [showPwaBanner, setShowPwaBanner] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(data?.name || '')
  const [bio, setBio] = useState(data?.bio || '')
  const [nickname, setNickname] = useState('')
  const [isEditingNickname, setIsEditingNickname] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false)
  const [companyName, setCompanyName] = useState<string | null>(null)
  
  const [userPosts, setUserPosts] = useState<any[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  
  const [linkedin, setLinkedin] = useState(data?.linkedin || '')
  const [github, setGithub] = useState(data?.github || '')
  const [portfolio, setPortfolio] = useState(data?.portfolio || '')
  const [collegeName, setCollegeName] = useState(data?.college_name || '')
  const [course, setCourse] = useState(data?.course || '')
  const [jobRole, setJobRole] = useState(data?.job_role || '')
  const [experienceYears, setExperienceYears] = useState(data?.experience_years || '')
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(data?.avatar_url || '')

  const [instagram, setInstagram] = useState(data?.instagram || '')
  const [experiences, setExperiences] = useState<any[]>(data?.experience || [])
  const [educations, setEducations] = useState<any[]>(data?.education?.length ? data.education : (data?.college_name ? [{ school: data?.college_name, degree: data?.course || '', startDate: '', endDate: '', present: false, description: '' }] : []))
  const [skills, setSkills] = useState<string[]>(data?.skills || [])
  const [newSkillInput, setNewSkillInput] = useState('')
  const [resumeUrl, setResumeUrl] = useState(data?.resume_url || '')
  const [certificates, setCertificates] = useState<{title: string, url: string}[]>(data?.certificates || [])
  
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false)
  const [connectionsTab, setConnectionsTab] = useState<'followers' | 'following'>('followers')

  const { user, profile, refreshProfile, signOut } = useAuth()
  
  const [challengeStats, setChallengeStats] = useState({ solved: 0, points: 0 })
  const [groupMemberCount, setGroupMemberCount] = useState<number>(0)
  const [groupMembers, setGroupMembers] = useState<any[]>([])

  const fetchChallengeStats = useCallback(async () => {
    const targetId = type === 'profile' ? user?.id : data?.id
    if (!targetId) return
    try {
      const stats = await api.get(`/profiles/${targetId}/xp`)
      if (stats) {
        setChallengeStats({
          solved: stats.solved || 0,
          points: stats.xp || 0
        })
      }
    } catch (e) { /* non-fatal */ }
  }, [type, user?.id, data?.id])
  
  const targetUserId = type === 'profile' ? user?.id : data?.id
  const { followersCount, followingCount, isFollowing, toggleFollow, loading: connectionLoading } = useConnections(targetUserId)
  const { rankInfo, loading: rankLoading } = useUserRank(targetUserId)

  useEffect(() => {
    setName(data?.name || '')
    setBio(data?.bio || data?.description || '')
    setIsEditing(false)
    setIsEditingNickname(false)
    setCompanyName(null)

    if (type === 'contact' && data?.id) {
      const saved = localStorage.getItem(`nickname_${data.id}`)
      setNickname(saved || '')
    }

    setLinkedin(data?.linkedin || '')
    setGithub(data?.github || '')
    setPortfolio(data?.portfolio || '')
    setCollegeName(data?.college_name || '')
    setCourse(data?.course || '')
    setJobRole(data?.job_role || '')
    setExperienceYears(data?.experience_years || '')
    setCurrentAvatarUrl(data?.avatar_url || '')
    setInstagram(data?.instagram || '')
    setExperiences(data?.experience || [])
    setEducations(data?.education?.length ? data.education : (data?.college_name ? [{ school: data?.college_name, degree: data?.course || '', startDate: '', endDate: '', present: false, description: '' }] : []))
    setSkills(data?.skills || [])
    setResumeUrl(data?.resume_url || '')
    setCertificates(data?.certificates || [])

    if (type === 'group' && data?.id) {
      api.get(`/chats/${data.id}/members`)
        .then((membersData: any[]) => {
          if (membersData) {
            setGroupMembers(membersData)
            setGroupMemberCount(membersData.length)
          }
        })
        .catch(() => {})
    }

    // Profile Completion Toast
    if (isOpen && type === 'profile' && profile) {
      const isBioDefault = !profile.bio || profile.bio === 'Hey there! I am using Connectly.'
      const isMissingSkills = !profile.skills || profile.skills.length === 0
      const isMissingEdu = !profile.college_name && (!profile.education || profile.education.length === 0)
      
      if (isBioDefault || isMissingSkills || isMissingEdu) {
        toast.info('Complete Your Profile', {
          description: 'Add your bio, skills, and education to help others find you.',
          action: {
            label: 'Edit Now',
            onClick: () => setIsEditing(true)
          },
          duration: 6000
        })
      }
    }
  }, [data, type, isOpen, profile])

  useEffect(() => {
    fetchChallengeStats()
  }, [user, data, type])

  useEffect(() => {
    const handleChallengesUpdate = () => fetchChallengeStats()
    window.addEventListener('challenges:updated', handleChallengesUpdate)
    return () => window.removeEventListener('challenges:updated', handleChallengesUpdate)
  }, [fetchChallengeStats])

  useEffect(() => {
    const targetUserId = type === 'profile' ? user?.id : data?.id
    if (!targetUserId) return

    // Fetch full profile via custom API if any extended fields are missing
    const isMissingDetails = type === 'contact' && data?.id && (
      data.bio === undefined ||
      data.experience === undefined ||
      data.education === undefined ||
      data.linkedin === undefined
    )

    if (isMissingDetails) {
      api.get(`/profiles/${targetUserId}`)
        .then((fullProfile: any) => {
          if (fullProfile) {
            setBio(fullProfile.bio || '')
            setLinkedin(fullProfile.linkedin || '')
            setGithub(fullProfile.github || '')
            setPortfolio(fullProfile.portfolio || '')
            setInstagram(fullProfile.instagram || '')
            setExperiences(fullProfile.experience || [])
            setEducations(fullProfile.education?.length ? fullProfile.education : (fullProfile.college_name ? [{ school: fullProfile.college_name, degree: fullProfile.course || '', startDate: '', endDate: '', present: false, description: '' }] : []))
            setCollegeName(fullProfile.college_name || '')
            setCourse(fullProfile.course || '')
            setJobRole(fullProfile.job_role || '')
            setExperienceYears(fullProfile.experience_years || '')
            setSkills(fullProfile.skills || [])
          }
        })
        .catch(() => {})
    }
  }, [user?.id, data?.id, type])

  useEffect(() => {
    const targetUserId = type === 'profile' ? user?.id : data?.id
    if (!targetUserId) {
      setUserPosts([])
      setLoadingPosts(false)
      return
    }

    let isMounted = true
    setLoadingPosts(true)

    api.get(`/posts/user/${targetUserId}`)
      .then((fetchedPosts: any[]) => {
        if (!isMounted) return
        setUserPosts(fetchedPosts || [])
        setLoadingPosts(false)
      })
      .catch((e: any) => {
        if (!isMounted) return
        console.error('Exception fetching posts for grid:', e)
        setUserPosts([])
        setLoadingPosts(false)
      })

    return () => { isMounted = false }
  }, [type, user?.id, data?.id])

  const handleUpdateProfile = async () => {
    setLoading(true)
    if (!user) { setLoading(false); return }
    try {
      await api.put(`/profiles/${user.id}`, {
        name, bio, linkedin, github, portfolio, instagram,
        college_name: collegeName, course, job_role: jobRole,
        experience_years: experienceYears === '' ? null : parseInt(experienceYears as string, 10),
        avatar_url: currentAvatarUrl,
        experience: experiences,
        education: educations,
        skills, // Now sending skills correctly
        resume_url: resumeUrl,
        certificates,
      })
      await refreshProfile()
      setIsEditing(false) // Only close on success
    } catch (error: any) {
      console.error('[updateProfile] Error:', error)
      alert(`Error updating profile: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setLoading(true)
    try {
      // Upload via Cloudinary signed URL (reuses the existing /api/cloudinary/sign Next.js route)
      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: `avatars/${user.id}` })
      })
      const signData = await signRes.json()
      if (!signRes.ok) throw new Error(signData.error || 'Signature failed')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', signData.apiKey)
      formData.append('timestamp', signData.timestamp)
      formData.append('signature', signData.signature)
      formData.append('folder', `avatars/${user.id}`)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        { method: 'POST', body: formData }
      )
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error?.message || 'Upload failed')

      const publicUrl = uploadData.secure_url
      setCurrentAvatarUrl(publicUrl)
      await api.put(`/profiles/${user.id}`, { avatar_url: publicUrl })
      refreshProfile()
    } catch (error: any) {
      alert(`Error uploading avatar: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAvailability = async (e: React.MouseEvent) => {
    e.stopPropagation()
    // Simplified checks: allow toggle if viewing own profile
    if (!user) return
    const isOwner = type === 'profile' || data?.id === user?.id
    if (!isOwner || isTogglingAvailability) return
    
    // Check if the profile is actually a professional
    const currentRole = type === 'profile' ? profile?.role : data?.role
    if (currentRole !== 'professional') return

    const actualStatus = type === 'profile' ? profile?.availability_status : data?.availability_status
    const newStatus = !actualStatus

    setIsTogglingAvailability(true)

    try {
      await api.put(`/profiles/${user.id}`, { availability_status: newStatus })
      await refreshProfile()
    } catch (err: any) {
      console.error('[toggleAvailability]', err)
      alert(`Error toggling availability: ${err.message}`)
    } finally {
      setIsTogglingAvailability(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    if (user) {
      // Mark offline via custom API before signing out
      await api.put(`/profiles/${user.id}`, { status: 'offline', last_seen: new Date().toISOString() }).catch(() => {})
    }
    await signOut()
    window.location.href = '/login'
  }

  const getVerificationBadge = (level: number) => {
    switch (level) {
      case 3: return { label: 'Verified Professional', color: 'text-white', border: 'bg-white/[0.06] border-white/10' }
      case 2: return { label: 'Verified Profile', color: 'text-zinc-300', border: 'bg-white/[0.04] border-white/[0.06]' }
      case 1: return { label: 'Profile Added', color: 'text-zinc-500', border: 'bg-white/[0.03] border-transparent' }
      default: return { label: 'New User', color: 'text-zinc-600', border: 'bg-white/[0.02] border-transparent' }
    }
  }

  const isContactOnline = useIsUserOnline(type === 'contact' ? data : null)

  const handleSaveNickname = () => {
    if (data?.id) {
      if (nickname.trim()) localStorage.setItem(`nickname_${data.id}`, nickname.trim())
      else localStorage.removeItem(`nickname_${data.id}`)
    }
    setIsEditingNickname(false)
  }

  const getTitle = () => {
    if (type === 'profile') return 'Profile'
    if (type === 'contact') return 'Contact Info'
    return 'Group Info'
  }

  const SkillPills = ({ skills, small }: { skills: string[]; small?: boolean }) => (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((skill) => (
        <span key={skill} className={`px-2.5 py-1 rounded-full bg-white/[0.06] text-zinc-300 font-medium ${small ? 'text-[11px]' : 'text-xs'}`}>
          {skill}
        </span>
      ))}
    </div>
  )
  const formatDate = (val: string) => {
    if (!val) return ''
    const parts = val.split('-')
    if (parts.length === 2) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1).toLocaleString('default', { month: 'short', year: 'numeric' })
    }
    if (parts.length === 3) {
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleString('default', { day: 'numeric', month: 'short', year: 'numeric' })
    }
    return val
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="absolute inset-y-0 right-0 z-[400] flex w-full h-full bg-black/50 backdrop-blur-[2px]">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="ml-auto w-full md:w-[400px] h-full bg-[#0a0a0a] border-l border-white/[0.04] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="h-[100px] bg-[#0a0a0a] flex items-end px-6 pb-4 relative border-b border-white/[0.04]">
              <div className="absolute top-4 left-4">
                <button onClick={onClose} className="p-2 hover:bg-white/[0.06] rounded-full transition-colors text-zinc-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 flex justify-between items-end">
                <h2 className="text-white text-lg font-bold">{getTitle()}</h2>
                {type === 'profile' && !isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-zinc-200 text-black rounded-full text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 mb-0.5"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </button>
                )}
                {type === 'profile' && isEditing && (
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 mb-0.5"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-12 space-y-8">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => type === 'profile' && document.getElementById('avatar-upload')?.click()}>
                  <div className="w-40 h-40 rounded-full bg-white/[0.04] flex items-center justify-center overflow-hidden border-2 border-white/[0.06] group-hover:scale-[1.02] transition-transform relative">
                    {currentAvatarUrl ? (
                      <img src={currentAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-20 h-20 text-zinc-700" />
                    )}
                    {loading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  {type === 'profile' && (
                    <>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                      <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleUploadAvatar} />
                    </>
                  )}
                  {type === 'contact' && isContactOnline && data?.availability_status !== false && (
                    <div className="absolute bottom-2 right-2 w-5 h-5 bg-white rounded-full border-[3px] border-[#0a0a0a]" />
                  )}
                </div>

                {!rankLoading && rankInfo && (type === 'profile' || type === 'contact') && (
                  <div className="px-6 mt-5 w-full">
                    <div className={`p-3.5 rounded-2xl flex flex-col items-center justify-center border backdrop-blur-xl transition-all ${rankInfo.badgeBorder}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-black tracking-widest uppercase drop-shadow-xl ${rankInfo.color}`}>
                          {rankInfo.tier} Rank
                        </span>
                      </div>
                      
                      {rankInfo.nextTierXP ? (
                        <>
                          <div className="w-full bg-black/40 rounded-full overflow-hidden h-1.5 border border-white/5 relative">
                            <div 
                              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${rankInfo.color.includes('gradient') ? 'bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400' : rankInfo.tier === 'Diamond' ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : rankInfo.tier === 'Gold' ? 'bg-yellow-400' : rankInfo.tier === 'Silver' ? 'bg-slate-300' : 'bg-[#CD7F32]'}`}
                              style={{ width: `${rankInfo.progressPercentage}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5">
                            {rankInfo.xp.toLocaleString()} / {rankInfo.nextTierXP.toLocaleString()} XP
                          </span>
                        </>
                      ) : (
                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5">
                          {rankInfo.xp.toLocaleString()} XP (MAX RANK)
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {type === 'contact' && (
                  <div className="text-center mt-2">
                    <h3 className="text-white text-2xl font-bold">{nickname || data?.name || 'Unknown'}</h3>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      {isContactOnline ? (
                        <span className="text-zinc-400 text-sm font-medium">online</span>
                      ) : (
                        <span className="text-zinc-600 text-sm">offline</span>
                      )}
                      <span className="text-zinc-800">·</span>
                      <span className="text-white font-bold text-sm tracking-tight">{followersCount}</span>
                      <span className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider">Connections</span>
                      <span className="text-zinc-800">·</span>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-400/10 rounded-full border border-amber-400/20">
                        <Trophy className="w-2.5 h-2.5 text-amber-500" />
                        <span className="text-amber-500 font-bold text-[10px] uppercase tracking-tighter">{challengeStats.solved} Solved</span>
                      </div>
                    </div>

                    {/* Contact Connect Button */}
                    {data?.id !== user?.id && (
                      <div className="flex justify-center gap-2 mt-4">
                        <button 
                          onClick={toggleFollow}
                          disabled={connectionLoading}
                          className={`flex items-center justify-center gap-2 px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${isFollowing ? 'bg-white/[0.06] text-white border border-white/10 hover:bg-white/10' : 'bg-white text-black hover:bg-zinc-200'}`}
                        >
                          {isFollowing ? (
                            <>
                              <Check className="w-4 h-4" />
                              Connected
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Connect
                            </>
                          )}
                        </button>
                        <button 
                          onClick={() => onViewPosts?.(data?.id)}
                          className="p-2.5 bg-white/[0.06] hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all active:scale-95"
                          title="View Posts"
                        >
                          <Rocket className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info Rows */}
              <div className="space-y-6">

                {/* ===== PROFILE MODE ===== */}
                {type === 'profile' && (
                  <>
                    {data?.verification_level !== undefined && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${getVerificationBadge(data.verification_level).border}`}>
                        <ShieldCheck className={`w-4 h-4 ${getVerificationBadge(data.verification_level).color}`} />
                        <span className={`text-sm font-medium ${getVerificationBadge(data.verification_level).color}`}>
                          {getVerificationBadge(data.verification_level).label}
                        </span>
                      </div>
                    )}

                    {(type === 'profile' || data?.id === user?.id) && (type === 'profile' ? profile?.role : data?.role) === 'professional' && (
                      <div 
                        onClick={handleToggleAvailability}
                        className={`flex items-center justify-between bg-white/[0.03] rounded-xl p-4 cursor-pointer transition-all hover:bg-white/[0.06] ${isTogglingAvailability ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <Signal className={`w-4 h-4 ${(type === 'profile' ? profile?.availability_status : data?.availability_status) ? 'text-white' : 'text-zinc-600'}`} />
                          <div>
                            <p className="text-white font-medium text-sm">Available for messages</p>
                            <p className="text-zinc-600 text-xs">{(type === 'profile' ? profile?.availability_status : data?.availability_status) ? 'Visible in search' : 'Hidden'}</p>
                          </div>
                        </div>
                        <button
                          disabled={isTogglingAvailability}
                          className={`relative w-11 h-6 rounded-full transition-all duration-300 ${(type === 'profile' ? profile?.availability_status : data?.availability_status) ? 'bg-white' : 'bg-white/[0.1]'} disabled:opacity-50`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${(type === 'profile' ? profile?.availability_status : data?.availability_status) ? 'left-6 bg-black' : 'left-1 bg-zinc-500'}`} />
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Your Name</label>
                        {type === 'profile' && !isEditing && (
                          <button onClick={() => setIsEditing(true)} className="p-1 text-zinc-500 hover:text-white transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between group">
                        {isEditing ? (
                          <input type="text" className="w-full bg-transparent border-b border-white/20 py-1 text-white text-lg focus:ring-0 outline-none focus:border-white/40" value={name} onChange={(e) => setName(e.target.value)} />
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-white text-lg font-medium">{name || 'Add a name'}</span>
                            <div className="flex items-center gap-4 mt-1">
                              <button 
                                onClick={() => { setConnectionsTab('followers'); setIsConnectionsModalOpen(true); }}
                                className="flex items-center gap-1.5 hover:bg-white/[0.05] p-1 -ml-1 rounded transition-colors"
                              >
                                <span className="text-white font-bold text-sm">{followersCount}</span>
                                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-tight">Connections</span>
                              </button>
                              <button 
                                onClick={() => { setConnectionsTab('following'); setIsConnectionsModalOpen(true); }}
                                className="flex items-center gap-1.5 hover:bg-white/[0.05] p-1 -ml-1 rounded transition-colors"
                              >
                                <span className="text-white font-bold text-sm">{followingCount}</span>
                                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-tight">Following</span>
                              </button>
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-400/10 rounded-full border border-amber-400/20">
                                <Trophy className="w-2.5 h-2.5 text-amber-500" />
                                <span className="text-amber-500 font-bold text-[10px] uppercase tracking-tighter">{challengeStats.solved} Solved</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {data?.role === 'professional' && (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Job Role</label>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input type="text" className="flex-1 bg-transparent border-b border-white/20 py-1 text-white text-sm focus:ring-0 outline-none" value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="Job Role" />
                               <input type="text" className="w-20 bg-transparent border-b border-white/20 py-1 text-white text-sm focus:ring-0 outline-none" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="Years" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-zinc-600" />
                              <p className="text-zinc-300 font-medium">{jobRole}{experienceYears ? ` · ${experienceYears} yrs` : 'Add role'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Skills Section (Editable) */}
                    <div className="space-y-4 pt-6 border-t border-white/[0.04]">
                      <div className="flex items-center justify-between">
                        <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Skills</label>
                        {isEditing && (
                           <div className="flex items-center gap-2">
                             <input 
                               type="text" 
                               placeholder="Add skill..." 
                               className="bg-white/[0.03] border-none rounded-lg px-3 py-1 text-xs text-white focus:ring-1 focus:ring-white/20 outline-none w-24"
                               value={newSkillInput}
                               onChange={(e) => setNewSkillInput(e.target.value)}
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter' && newSkillInput.trim()) {
                                   if (!skills.includes(newSkillInput.trim())) {
                                     setSkills([...skills, newSkillInput.trim()])
                                   }
                                   setNewSkillInput('')
                                 }
                               }}
                             />
                             <button 
                               onClick={() => {
                                 if (newSkillInput.trim() && !skills.includes(newSkillInput.trim())) {
                                   setSkills([...skills, newSkillInput.trim()])
                                   setNewSkillInput('')
                                 }
                               }}
                               className="p-1 bg-white/10 rounded-md hover:bg-white/20 transition-colors"
                             >
                               <Plus className="w-3 h-3 text-white" />
                             </button>
                           </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {skills.map((skill, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/[0.04] rounded-lg group">
                            <span className="text-zinc-300 text-xs font-medium">{skill}</span>
                            {isEditing && (
                              <button 
                                onClick={() => setSkills(skills.filter((_, i) => i !== idx))}
                                className="text-zinc-600 hover:text-red-400 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {skills.length === 0 && !isEditing && <p className="text-zinc-600 text-xs italic">No skills listed.</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">About</label>
                      <div className="flex items-start justify-between group">
                        {isEditing ? (
                          <textarea className="w-full bg-transparent border-b border-white/20 py-1 text-white focus:ring-0 outline-none min-h-[80px]" value={bio} onChange={(e) => setBio(e.target.value)} />
                        ) : (
                          <p className="text-zinc-500 leading-relaxed">{bio || 'Hey there! I am using Nexus.'}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Experience</label>
                        {isEditing && (
                          <button 
                            onClick={() => setExperiences([...experiences, { title: '', company: '', startDate: '', endDate: '', present: false, description: '' }])}
                            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-4">
                          {experiences.map((exp, idx) => (
                            <div key={idx} className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl space-y-3 relative group">
                              <button 
                                onClick={() => setExperiences(experiences.filter((_, i) => i !== idx))}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-500/20 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <input type="text" placeholder="Job Title (e.g. Frontend Developer)" className="bg-transparent border-b border-white/10 w-full text-sm text-white focus:border-white/30 outline-none pb-1" value={exp.title} onChange={(e) => { const newExp = [...experiences]; newExp[idx].title = e.target.value; setExperiences(newExp); }} />
                              <input type="text" placeholder="Company Name" className="bg-transparent border-b border-white/10 w-full text-sm text-white focus:border-white/30 outline-none pb-1" value={exp.company} onChange={(e) => { const newExp = [...experiences]; newExp[idx].company = e.target.value; setExperiences(newExp); }} />
                              
                              <div className="flex items-center gap-3">
                                <div className="flex-1 space-y-1">
                                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Start Date</label>
                                  <input type="date" className="bg-transparent border-b border-white/10 w-full text-sm text-white focus:border-white/30 outline-none pb-1 [&::-webkit-calendar-picker-indicator]:invert" value={exp.startDate || ''} onChange={(e) => { const newExp = [...experiences]; newExp[idx].startDate = e.target.value; setExperiences(newExp); }} />
                                </div>
                                {!exp.present && (
                                  <div className="flex-1 space-y-1">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold">End Date</label>
                                    <input type="date" className="bg-transparent border-b border-white/10 w-full text-sm text-white focus:border-white/30 outline-none pb-1 [&::-webkit-calendar-picker-indicator]:invert" value={exp.endDate || ''} onChange={(e) => { const newExp = [...experiences]; newExp[idx].endDate = e.target.value; setExperiences(newExp); }} />
                                  </div>
                                )}
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer mt-1 w-fit">
                                <input type="checkbox" className="rounded bg-white/10 border-none text-white focus:ring-0 w-3 h-3" checked={exp.present || false} onChange={(e) => { const newExp = [...experiences]; newExp[idx].present = e.target.checked; if(e.target.checked) newExp[idx].endDate = ''; setExperiences(newExp); }} />
                                <span className="text-xs text-zinc-400">I currently work here</span>
                              </label>

                              <textarea placeholder="Description" rows={2} className="bg-white/[0.03] border-transparent rounded-lg w-full text-xs text-white focus:ring-1 focus:ring-white/20 p-2 outline-none mt-2" value={exp.description} onChange={(e) => { const newExp = [...experiences]; newExp[idx].description = e.target.value; setExperiences(newExp); }} />
                            </div>
                          ))}
                          {experiences.length === 0 && <p className="text-zinc-600 text-xs italic">No experience added.</p>}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {experiences.map((exp, idx) => (
                            <div key={idx} className="flex gap-4">
                              <div className="w-10 h-10 shrink-0 bg-white/[0.04] rounded-lg flex items-center justify-center text-zinc-500 border border-white/[0.04]">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col flex-1">
                                <span className="text-white font-bold text-sm">{exp.title}</span>
                                <span className="text-zinc-400 text-xs">{exp.company}</span>
                                <span className="text-zinc-500 text-[10px] uppercase font-semibold mt-0.5">
                                  {exp.startDate ? `${formatDate(exp.startDate)} - ${exp.present ? 'Present' : formatDate(exp.endDate) || 'Present'}` : exp.duration}
                                </span>
                                {exp.description && <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">{exp.description}</p>}
                              </div>
                            </div>
                          ))}
                          {experiences.length === 0 && <p className="text-zinc-600 text-sm">No experience listed.</p>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Education</label>
                        {isEditing && (
                          <button 
                            onClick={() => setEducations([...educations, { school: '', degree: '', startDate: '', endDate: '', present: false, description: '' }])}
                            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add
                          </button>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-4">
                          {educations.map((edu, idx) => (
                            <div key={idx} className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl space-y-3 relative group">
                              <button 
                                onClick={() => setEducations(educations.filter((_, i) => i !== idx))}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-500/20 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <input type="text" placeholder="School / University" className="bg-transparent border-b border-white/10 w-full text-sm text-white focus:border-white/30 outline-none pb-1" value={edu.school} onChange={(e) => { const newEdu = [...educations]; newEdu[idx].school = e.target.value; setEducations(newEdu); }} />
                              <input type="text" placeholder="Degree / Course" className="bg-transparent border-b border-white/10 w-full text-sm text-white focus:border-white/30 outline-none pb-1" value={edu.degree} onChange={(e) => { const newEdu = [...educations]; newEdu[idx].degree = e.target.value; setEducations(newEdu); }} />
                              
                              <div className="flex items-center gap-3">
                                <div className="flex-1 space-y-1">
                                  <label className="text-[10px] text-zinc-500 uppercase font-bold">Start Date</label>
                                  <input type="date" className="bg-transparent border-b border-white/10 w-full text-sm text-white focus:border-white/30 outline-none pb-1 [&::-webkit-calendar-picker-indicator]:invert" value={edu.startDate || ''} onChange={(e) => { const newEdu = [...educations]; newEdu[idx].startDate = e.target.value; setEducations(newEdu); }} />
                                </div>
                                {!edu.present && (
                                  <div className="flex-1 space-y-1">
                                    <label className="text-[10px] text-zinc-500 uppercase font-bold">End Date</label>
                                    <input type="date" className="bg-transparent border-b border-white/10 w-full text-sm text-white focus:border-white/30 outline-none pb-1 [&::-webkit-calendar-picker-indicator]:invert" value={edu.endDate || ''} onChange={(e) => { const newEdu = [...educations]; newEdu[idx].endDate = e.target.value; setEducations(newEdu); }} />
                                  </div>
                                )}
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer mt-1 w-fit">
                                <input type="checkbox" className="rounded bg-white/10 border-none text-white focus:ring-0 w-3 h-3" checked={edu.present || false} onChange={(e) => { const newEdu = [...educations]; newEdu[idx].present = e.target.checked; if(e.target.checked) newEdu[idx].endDate = ''; setEducations(newEdu); }} />
                                <span className="text-xs text-zinc-400">I currently study here</span>
                              </label>

                              <textarea placeholder="Description / Extracurriculars" rows={2} className="bg-white/[0.03] border-transparent rounded-lg w-full text-xs text-white focus:ring-1 focus:ring-white/20 p-2 outline-none mt-2" value={edu.description} onChange={(e) => { const newEdu = [...educations]; newEdu[idx].description = e.target.value; setEducations(newEdu); }} />
                            </div>
                          ))}
                          {educations.length === 0 && <p className="text-zinc-600 text-xs italic">No education added.</p>}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {educations.map((edu, idx) => (
                            <div key={idx} className="flex gap-4">
                              <div className="w-10 h-10 shrink-0 bg-white/[0.04] rounded-lg flex items-center justify-center text-zinc-500 border border-white/[0.04]">
                                <GraduationCap className="w-5 h-5" />
                              </div>
                              <div className="flex flex-col flex-1">
                                <span className="text-white font-bold text-sm">{edu.school}</span>
                                <span className="text-zinc-400 text-xs">{edu.degree}</span>
                                <span className="text-zinc-500 text-[10px] uppercase font-semibold mt-0.5">
                                  {edu.startDate ? `${formatDate(edu.startDate)} - ${edu.present ? 'Present' : formatDate(edu.endDate) || 'Present'}` : ''}
                                </span>
                                {edu.description && <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">{edu.description}</p>}
                              </div>
                            </div>
                          ))}
                          {educations.length === 0 && <p className="text-zinc-600 text-sm">No education listed.</p>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Links</label>
                      {isEditing ? (
                        <div className="space-y-3 pt-1">
                          <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3">
                            <Link className="w-4 h-4 text-zinc-600" />
                            <input type="text" placeholder="LinkedIn URL" className="bg-transparent border-none text-sm text-white w-full p-0 focus:ring-0 outline-none placeholder-zinc-700" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
                          </div>
                          <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3">
                            <Camera className="w-4 h-4 text-zinc-600" />
                            <input type="text" placeholder="Instagram Username (e.g. zuck)" className="bg-transparent border-none text-sm text-white w-full p-0 focus:ring-0 outline-none placeholder-zinc-700" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
                          </div>
                          <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3">
                            <Globe className="w-4 h-4 text-zinc-600" />
                            <input type="text" placeholder="Github Username" className="bg-transparent border-none text-sm text-white w-full p-0 focus:ring-0 outline-none placeholder-zinc-700" value={github} onChange={(e) => setGithub(e.target.value)} />
                          </div>
                          <div className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3">
                            <Globe className="w-4 h-4 text-zinc-600" />
                            <input type="text" placeholder="Portfolio Link" className="bg-transparent border-none text-sm text-white w-full p-0 focus:ring-0 outline-none placeholder-zinc-700" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 pt-1">
                          {linkedin && (
                            <a href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border border-white/[0.04]">
                              <div className="flex items-center gap-3"><Link className="w-4 h-4 text-zinc-400" /><span className="text-white text-[13px] font-medium">LinkedIn</span></div>
                              <Globe className="w-3.5 h-3.5 text-zinc-600" />
                            </a>
                          )}
                          {instagram && (
                            <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border border-white/[0.04]">
                              <div className="flex items-center gap-3"><Camera className="w-4 h-4 text-pink-500" /><span className="text-white text-[13px] font-medium">Instagram</span></div>
                              <Globe className="w-3.5 h-3.5 text-zinc-600" />
                            </a>
                          )}
                          {github && (
                            <a href={github.startsWith('http') ? github : `https://github.com/${github.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border border-white/[0.04]">
                              <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-zinc-400" /><span className="text-white text-[13px] font-medium">GitHub</span></div>
                              <Globe className="w-3.5 h-3.5 text-zinc-600" />
                            </a>
                          )}
                          {portfolio && (
                            <a href={portfolio.startsWith('http') ? portfolio : `https://${portfolio}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border border-white/[0.04]">
                              <div className="flex items-center gap-3"><Link className="w-4 h-4 text-zinc-400" /><span className="text-white text-[13px] font-medium">Portfolio</span></div>
                              <Globe className="w-3.5 h-3.5 text-zinc-600" />
                            </a>
                          )}
                          {!linkedin && !instagram && !github && !portfolio && <p className="text-zinc-600 text-sm">No links added yet.</p>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Professional Documents</label>
                        {isEditing && (
                          <button 
                            onClick={() => setCertificates([...certificates, { title: '', url: '' }])}
                            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Certificate
                          </button>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="bg-white/[0.03] border border-white/[0.04] p-3 rounded-xl space-y-3 relative group">
                            {resumeUrl && (
                              <button 
                                onClick={() => setResumeUrl('')}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500/40 transition-all z-10"
                                title="Clear Resume"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                            <label className="text-[10px] text-zinc-500 uppercase font-bold">Resume / CV Link</label>
                            <input type="text" placeholder="https://drive.google.com/... or anything else" className="bg-transparent border-b border-white/10 w-full text-sm text-white focus:border-white/30 outline-none pb-1" value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} />
                          </div>

                          {certificates.map((cert, idx) => (
                            <div key={idx} className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl space-y-3 relative group">
                              <button 
                                onClick={() => setCertificates(certificates.filter((_, i) => i !== idx))}
                                className="absolute -top-2 -right-2 p-1.5 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500/40 transition-all z-10"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <input type="text" placeholder="Certificate Title" className="bg-transparent border-b border-white/10 w-full text-sm text-white focus:border-white/30 outline-none pb-1" value={cert.title} onChange={(e) => { const newCerts = [...certificates]; newCerts[idx].title = e.target.value; setCertificates(newCerts); }} />
                              <input type="text" placeholder="Certificate URL" className="bg-transparent border-b border-white/10 w-full text-sm text-white focus:border-white/30 outline-none pb-1" value={cert.url} onChange={(e) => { const newCerts = [...certificates]; newCerts[idx].url = e.target.value; setCertificates(newCerts); }} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 pt-1">
                          {resumeUrl && (
                            <a href={resumeUrl.startsWith('http') ? resumeUrl : `https://${resumeUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border border-white/[0.04]">
                              <div className="flex items-center gap-3"><BookOpen className="w-4 h-4 text-zinc-400" /><span className="text-white text-[13px] font-medium">View Resume / CV</span></div>
                              <Download className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors" />
                            </a>
                          )}
                          {certificates.map((cert, idx) => (
                            <a key={idx} href={cert.url.startsWith('http') ? cert.url : `https://${cert.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border border-white/[0.04] group">
                              <div className="flex items-center gap-3"><Trophy className="w-4 h-4 text-amber-500" /><span className="text-white text-[13px] font-medium">{cert.title || 'Certificate'}</span></div>
                              <Download className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white transition-colors" />
                            </a>
                          ))}
                          {!resumeUrl && certificates.length === 0 && <p className="text-zinc-600 text-sm">No professional documents added.</p>}
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsEditing(false)} disabled={loading} className="px-4 py-2 text-zinc-500 font-bold hover:bg-white/[0.04] rounded-lg text-sm">Cancel</button>
                        <button onClick={handleUpdateProfile} disabled={loading} className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-all text-sm">
                          {loading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}

                  </>
                )}

                {/* ===== CONTACT MODE ===== */}
                {type === 'contact' && (
                  <>
                    <div className="bg-white/[0.03] rounded-xl p-4 space-y-2">
                      <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Nickname (only visible to you)</label>
                      <div className="flex items-center justify-between gap-2">
                        {isEditingNickname ? (
                          <div className="flex items-center gap-2 w-full">
                            <input type="text" className="flex-1 bg-transparent border-b border-white/20 py-1 text-white text-lg focus:ring-0 outline-none" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder={data?.name || 'Set a nickname...'} autoFocus />
                            <button onClick={handleSaveNickname} className="p-2 text-white hover:text-zinc-300">
                              <Check className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-white text-lg">{nickname || 'Not set'}</span>
                            <button onClick={() => setIsEditingNickname(true)} className="p-2 text-zinc-600 hover:text-white transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {data?.id && (
                      <div className="space-y-3 pt-2">
                        <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Activity</label>
                        <button 
                          onClick={() => onViewPosts?.(data.id)}
                          className="w-full flex items-center justify-between p-3.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all group border border-white/[0.04]"
                        >
                          <div className="flex items-center gap-3">
                            <Rocket className="w-5 h-5 text-zinc-400 group-hover:scale-110 transition-transform" />
                            <div className="text-left">
                              <span className="text-white text-sm font-bold block">View Achievements</span>
                              <span className="text-zinc-600 text-[11px]">See all projects & workshops</span>
                            </div>
                          </div>
                        </button>
                      </div>
                    )}

                    {data?.verification_level !== undefined && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${getVerificationBadge(data.verification_level).border}`}>
                        <ShieldCheck className={`w-4 h-4 ${getVerificationBadge(data.verification_level).color}`} />
                        <span className={`text-xs font-medium ${getVerificationBadge(data.verification_level).color}`}>
                          {getVerificationBadge(data.verification_level).label}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Name</label>
                      <p className="text-white text-lg font-medium">{data?.name || 'Unknown'}</p>
                    </div>

                    <div className="space-y-4 pt-2">
                        {experiences.length > 0 && (
                          <div className="space-y-4">
                            <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Experience</label>
                            {experiences.map((exp, idx) => (
                              <div key={idx} className="flex gap-4">
                                <div className="w-10 h-10 shrink-0 bg-white/[0.04] rounded-lg flex items-center justify-center text-zinc-500 border border-white/[0.04]">
                                  <Briefcase className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col flex-1">
                                  <span className="text-white font-bold text-sm">{exp.title}</span>
                                  <span className="text-zinc-400 text-xs">{exp.company}</span>
                                  <span className="text-zinc-500 text-[10px] uppercase font-semibold mt-0.5">
                                    {exp.startDate ? `${formatDate(exp.startDate)} - ${exp.present ? 'Present' : formatDate(exp.endDate) || 'Present'}` : exp.duration}
                                  </span>
                                  {exp.description && <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">{exp.description}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {educations.length > 0 && (
                          <div className="space-y-4">
                            <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Education</label>
                            {educations.map((edu, idx) => (
                              <div key={idx} className="flex gap-4">
                                <div className="w-10 h-10 shrink-0 bg-white/[0.04] rounded-lg flex items-center justify-center text-zinc-500 border border-white/[0.04]">
                                  <GraduationCap className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col flex-1">
                                  <span className="text-white font-bold text-sm">{edu.school}</span>
                                  <span className="text-zinc-400 text-xs">{edu.degree}</span>
                                  <span className="text-zinc-500 text-[10px] uppercase font-semibold mt-0.5">
                                    {edu.startDate ? `${formatDate(edu.startDate)} - ${edu.present ? 'Present' : formatDate(edu.endDate) || 'Present'}` : ''}
                                  </span>
                                  {edu.description && <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">{edu.description}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                    {skills?.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Skills</label>
                        <SkillPills skills={skills} small />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">About</label>
                      <div className="flex items-start gap-3"><Info className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" /><p className="text-zinc-500 text-sm leading-relaxed">{bio || 'Hey there! I am using Nexus.'}</p></div>
                    </div>
                    {(linkedin || github || portfolio || instagram) && (
                      <div className="space-y-3 pt-1">
                        <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Links</label>
                        <div className="flex flex-col gap-2">
                          {instagram && (
                            <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border border-white/[0.04]">
                              <div className="flex items-center gap-2.5"><Camera className="w-4 h-4 text-pink-500" /><span className="text-white text-xs font-medium">Instagram</span></div>
                              <Globe className="w-3.5 h-3.5 text-zinc-600" />
                            </a>
                          )}
                          {linkedin && (
                            <a href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border border-white/[0.04]">
                              <div className="flex items-center gap-2.5"><Link className="w-4 h-4 text-zinc-400" /><span className="text-white text-xs font-medium">LinkedIn</span></div>
                              <Globe className="w-3.5 h-3.5 text-zinc-600" />
                            </a>
                          )}
                          {github && (
                            <a href={github.startsWith('http') ? github : `https://github.com/${github.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border border-white/[0.04]">
                              <div className="flex items-center gap-2.5"><Globe className="w-4 h-4 text-zinc-400" /><span className="text-white text-xs font-medium">GitHub</span></div>
                              <Globe className="w-3.5 h-3.5 text-zinc-600" />
                            </a>
                          )}
                          {portfolio && (
                            <a href={portfolio.startsWith('http') ? portfolio : `https://${portfolio}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl transition-all border border-white/[0.04]">
                              <div className="flex items-center gap-2.5"><Link className="w-4 h-4 text-zinc-400" /><span className="text-white text-xs font-medium">Portfolio</span></div>
                              <Globe className="w-3.5 h-3.5 text-zinc-600" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ===== INSTAGRAM STYLE POST GRID (Both Profile & Contact) ===== */}
                {(type === 'profile' || type === 'contact') && (
                  <div className="space-y-3 pt-6 border-t border-white/[0.04]">
                    <div className="flex items-center justify-between">
                      <label className="text-white text-sm font-bold uppercase tracking-wider">Posts</label>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewPosts?.(type === 'profile' ? user?.id! : data?.id)
                        }} 
                        className="text-zinc-500 text-xs font-bold hover:text-white transition-colors"
                      >
                        View Feed
                      </button>
                    </div>
                    
                    {loadingPosts ? (
                       <div className="grid grid-cols-3 gap-1 animate-pulse">
                         {[1,2,3].map(i => <div key={i} className="aspect-square bg-white/[0.03]"></div>)}
                       </div>
                    ) : userPosts.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1">
                        {userPosts.map(post => {
                          const hasMedia = post.media_urls && post.media_urls.length > 0;
                          return (
                            <div 
                              key={post.id} 
                              className="aspect-square bg-white/[0.02] relative cursor-pointer group overflow-hidden" 
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewPosts?.(type === 'profile' ? user?.id! : data?.id)
                              }}
                            >
                               {hasMedia ? (
                                  post.media_types?.[0] === 'video' ? (
                                     <div className="w-full h-full relative">
                                        <video src={post.media_urls[0]} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        <Play className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white drop-shadow-xl" />
                                     </div>
                                  ) : (
                                     <img src={post.media_urls[0]} className="w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500" />
                                  )
                               ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-black group-hover:opacity-80 transition-opacity">
                                    <Rocket className="w-5 h-5 text-zinc-500 mb-1" />
                                    <span className="text-[8px] uppercase font-bold text-zinc-600 tracking-wider">Text Post</span>
                                  </div>
                               )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 bg-white/[0.02] rounded-xl border border-white/[0.02]">
                         <Rocket className="w-6 h-6 text-zinc-600 mb-2" />
                         <span className="text-xs text-zinc-500 font-medium">No posts shared yet</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== GROUP MODE ===== */}
                {type === 'group' && (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Group Name</label>
                        <span className="text-white text-lg font-medium block">{data?.name || 'Unnamed Group'}</span>
                      </div>
                      
                      {data?.description && (
                        <div className="space-y-2">
                          <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Description</label>
                          <div className="flex items-start gap-3">
                            <Info className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                            <p className="text-zinc-400 text-sm leading-relaxed">{data.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4 pt-6 border-t border-white/[0.04]">
                      <div className="flex items-center justify-between text-zinc-500 mb-2">
                        <label className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Members ({groupMemberCount || data?.members?.length || 0})</label>
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col gap-2">
                        {groupMembers.map((member: any) => {
                          const isOnline = member.status === 'online' && member.last_seen && (Date.now() - new Date(member.last_seen).getTime()) < 180000
                          return (
                           <div 
                             key={member.id} 
                             className="flex items-center gap-3 p-2 hover:bg-white/[0.02] rounded-xl transition-colors cursor-pointer" 
                             onClick={(e) => {
                               e.stopPropagation()
                               onViewPosts && onViewPosts(member.id)
                             }}
                           >
                              <div className="relative w-8 h-8 shrink-0">
                                <div className="w-8 h-8 rounded-full bg-white/[0.05] overflow-hidden flex items-center justify-center">
                                  {member.avatar_url ? (
                                    <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-4 h-4 text-zinc-500" />
                                  )}
                                </div>
                                {isOnline && (
                                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0d0d0f]" />
                                )}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 line-clamp-1">
                                  <span className="text-sm text-white font-medium truncate">{member.name || 'Unknown User'}</span>
                                  {member.role === 'admin' && <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-zinc-400 uppercase tracking-widest">Admin</span>}
                                  {isOnline && <span className="text-[9px] text-emerald-400 font-bold">● online</span>}
                                </div>
                                <span className="text-[10px] text-zinc-500 uppercase font-black truncate">{member.job_role || member.college_name || 'Member'}</span>
                              </div>
                           </div>
                          )
                        })}
                        {groupMembers.length === 0 && <span className="text-sm text-zinc-500 italic px-2">No members found.</span>}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Danger Zone */}
              <div className="pt-8 pb-40 space-y-4">
                {type === 'profile' && (
                  <>
                    <button 
                      onClick={handleLogout}
                      disabled={loading}
                      className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-red-500/[0.05] rounded-xl transition-all font-medium border border-red-500/10 group disabled:opacity-50"
                    >
                      <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-sm">{loading ? 'Logging out...' : 'Logout Account'}</span>
                    </button>

                    {/* PWA / Mobile App Section */}
                    <div className="mt-8 pt-6 border-t border-white/[0.04]">
                      <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-white/[0.02] rounded-2xl p-5 border border-white/[0.06] relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none">
                          <Smartphone className="w-32 h-32 text-white" />
                        </div>
                        
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                              <Smartphone className="w-4 h-4 text-white" />
                            </div>
                            <h4 className="text-white text-sm font-bold">Connectly Mobile</h4>
                          </div>
                          
                          <p className="text-[12px] text-zinc-400 mb-4 leading-relaxed">
                            Transform Nexus into a full-screen mobile app for the fastest experience.
                          </p>

                          {isInstallable ? (
                            <button 
                              onClick={installApp}
                              className="w-full py-2.5 rounded-xl bg-white text-black text-[11px] font-bold tracking-wide hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Install Application
                            </button>
                          ) : (
                            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                              <p className="text-[10px] text-zinc-500 leading-tight">
                                <span className="text-white font-bold block mb-1">How to install:</span>
                                1. Tap the share icon <span className="inline-block px-1 bg-white/10 rounded">↑</span> below<br/>
                                2. Select <span className="text-white font-medium">"Add to Home Screen"</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
  )}
                  </>
                )}
                {type === 'contact' && (
                  <button className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-red-500/[0.05] rounded-xl transition-all font-medium border border-red-500/10 group">
                    <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Delete Chat</span>
                  </button>
                )}
                {type === 'group' && (
                  <button className="w-full flex items-center gap-4 p-4 text-red-400 hover:bg-red-500/[0.05] rounded-xl transition-all font-medium border border-red-500/10 group">
                    <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Leave Group</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

      {/* Connections Modal */}
      {targetUserId && (
        <ConnectionsModal 
          isOpen={isConnectionsModalOpen}
          onClose={() => setIsConnectionsModalOpen(false)}
          userId={targetUserId}
          initialTab={connectionsTab}
        />
      )}
    </>
  )
}
