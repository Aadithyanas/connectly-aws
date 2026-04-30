'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, fetchProfile } = useAuth()
  const router = useRouter()
  // Use a ref for the retry flag so it never re-triggers the effect
  const retried = useRef(false)
  const retrying = useRef(false)

  useEffect(() => {
    // Still initializing — wait for AuthContext to finish
    if (loading) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    // No token at all → go to login immediately
    if (!token) {
      router.replace('/login')
      return
    }

    // Has token AND has user → already good, nothing to do
    if (user) return

    // Has token but no user yet — one retry attempt to hydrate the profile
    // (backend may have been briefly unavailable during first init)
    if (!retried.current && !retrying.current) {
      retried.current = true
      retrying.current = true
      fetchProfile()
        .catch((err) => {
          console.error('[ChatLayout] Hydration retry failed:', err.message)
          // Only redirect if the token was actually cleared (definitive auth failure)
          const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null
          if (!t) router.replace('/login')
        })
        .finally(() => { retrying.current = false })
    }
  }, [user, loading, router, fetchProfile])

  // Show spinner while AuthContext is initializing
  if (loading) {
    return (
      <div className="h-dvh bg-black text-white flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Connecting…</p>
      </div>
    )
  }

  // No token → about to redirect, show nothing
  if (!user && typeof window !== 'undefined' && !localStorage.getItem('token')) {
    return null
  }

  // Token exists but user not yet resolved (retry in flight) — keep spinner up
  if (!user) {
    return (
      <div className="h-dvh bg-black text-white flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Reconnecting…</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white/50 transition"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="h-dvh bg-black text-white overflow-hidden selection:bg-white/20 flex flex-col">
      <div className="flex-1 m-1.5 sm:m-3 border border-white/[0.06] rounded-xl overflow-hidden shadow-2xl bg-[#0a0a0a] flex overflow-hidden">
        {children}
      </div>
    </div>
  )
}
