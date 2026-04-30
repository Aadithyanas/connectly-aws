'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { GraduationCap, Briefcase, ChevronRight, X, Search, Globe, Loader2, CheckCircle2, Info, Plus, User, Building2, Code2, Link2, GitBranch, BookOpen, Award } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

type Role = 'student' | 'professional'

// ---------- Skill Tag Input ----------
function SkillTagInput({ skills, onChange }: { skills: string[]; onChange: (skills: string[]) => void }) {
  const [input, setInput] = useState('')
  const addSkill = () => {
    const trimmed = input.trim()
    if (trimmed && !skills.includes(trimmed)) onChange([...skills, trimmed])
    setInput('')
  }
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill() }
    if (e.key === 'Backspace' && !input && skills.length > 0) onChange(skills.slice(0, -1))
  }
  return (
    <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex flex-wrap gap-2 min-h-[52px] focus-within:ring-1 focus-within:ring-white/15 focus-within:border-white/12 transition-all cursor-text"
      onClick={() => document.getElementById('skill-input')?.focus()}>
      {skills.map(s => (
        <span key={s} className="flex items-center gap-1.5 bg-white/[0.06] text-zinc-300 text-xs px-3 py-1.5 rounded-lg font-medium border border-white/[0.06]">
          {s}
          <button type="button" onClick={e => { e.stopPropagation(); onChange(skills.filter(x => x !== s)) }}
            className="text-zinc-600 hover:text-white transition-colors"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input id="skill-input" type="text" value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey} onBlur={addSkill}
        placeholder={skills.length === 0 ? 'React, Python, UI Design…' : '+ Add more'}
        className="bg-transparent border-none outline-none text-sm text-white placeholder-zinc-700 min-w-[120px] flex-1 ml-1" />
    </div>
  )
}

// ---------- Main ----------
export default function OnboardingPage() {
  const { user, profile } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if we confirm the profile has a role
    // This prevents the infinite loop between middleware and chat
    if (user && profile?.role) {
      router.replace('/chat')
    }
  }, [user, profile, router])

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
      <h1 className="text-xl font-bold mb-2">Preparing your workspace...</h1>
      <p className="text-zinc-500 text-sm">Setting up your profile and getting things ready.</p>
    </div>
  )
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-0.5">
        <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.12em]">
          {label}{required && <span className="text-zinc-500 ml-0.5">*</span>}
        </label>
        {hint && <span className="text-[9px] font-medium text-zinc-700 uppercase tracking-wider">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
