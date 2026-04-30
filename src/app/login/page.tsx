'use client'

import { useCallback, useLayoutEffect, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LogIn } from 'lucide-react'
import { api } from '@/utils/api'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { GoogleLogin } from '@react-oauth/google'

export default function LoginPage() {
  const { user, loading } = useAuth()

  // `ready` = false  → render nothing (server SSR + pre-paint on client)
  // `ready` = true   → token was absent, safe to show the login UI
  // When a token IS found we never set ready=true, so we stay null forever
  // (the browser navigates away before the next paint anyway).
  const [ready, setReady] = useState(false)

  // useLayoutEffect fires SYNCHRONOUSLY after React commits the DOM but BEFORE
  // the browser paints. On the server it is silently skipped (no SSR execution).
  //
  // Timeline for an already-authenticated user:
  //   Server → renders null (ready=false)  ← no login HTML in initial payload
  //   Client hydrates → useLayoutEffect fires → token found → window.location.replace
  //   Browser never paints the login UI ✅
  //
  // Timeline for an unauthenticated user:
  //   Server → renders null (ready=false)
  //   Client hydrates → useLayoutEffect fires → no token → setReady(true)
  //   Browser paints login UI ✅
  useLayoutEffect(() => {
    const token = localStorage.getItem('token')
    const isValidToken = !!(token && token !== 'null' && token !== 'undefined')

    if (isValidToken) {
      // Token present — redirect without ever showing the login page
      window.location.replace('/chat')
    } else {
      // No token — safe to show the login UI
      setReady(true)
    }
  }, []) // runs once, synchronously before first paint

  // Belt-and-suspenders: also redirect when AuthContext confirms user is valid.
  // Covers the edge case where a user somehow reaches /login with a valid session.
  useEffect(() => {
    if (!loading && user) {
      window.location.replace('/chat')
    }
  }, [user, loading])

  const handleGoogleSuccess = useCallback(async (credentialResponse: any) => {
    const toastId = 'google-auth'
    try {
      toast.loading('Signing you in…', { id: toastId })

      const res = await api.post('/auth/google', {
        credential: credentialResponse.credential,
      })

      if (!res?.token) {
        throw new Error('No token received from server')
      }

      // Store token, mark as redirecting so UI disappears, then navigate
      localStorage.setItem('token', res.token)
      toast.success('Welcome!', { id: toastId })
      setReady(false) // collapse UI immediately before replace fires
      window.location.replace('/chat')
    } catch (err: any) {
      console.error('[Login] Error during login flow:', err)
      toast.error(err?.message || 'Login failed. Please try again.', { id: toastId })
    }
  }, [])

  // Render nothing until we've confirmed there is no valid token.
  // This prevents any flash on both SSR and client hydration.
  if (!ready) return null

  return (
    <div className="min-h-[100dvh] flex flex-col items-center py-16 md:py-24 bg-black text-white px-5 sm:px-6 relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-[440px] flex flex-col items-center gap-12 relative z-10"
      >
        {/* Brand */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4 shadow-2xl"
          >
            <LogIn className="w-8 h-8 text-white/80" />
          </motion.div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-[-0.05em] text-white">Nexus</h1>
          <p className="text-zinc-500 font-medium text-base">Connect with your professional network</p>
        </div>

        {/* Card */}
        <div className="w-full glass-card rounded-[32px] p-8 sm:p-10 border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl shadow-2xl">
          <div className="space-y-8">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-bold text-white/90">Welcome back</h2>
              <p className="text-zinc-600 text-sm">Sign in with Google to continue to your workspace</p>
            </div>

            {/* Single Google Login Button */}
            <div className="w-full flex flex-col items-center gap-4">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google sign-in was cancelled or failed')}
                theme="filled_black"
                shape="pill"
                size="large"
                text="continue_with"
                width="360"
              />
            </div>

            <p className="text-[10px] text-zinc-700 text-center uppercase tracking-[0.1em] font-bold">
              Secure Cloud Infrastructure
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-zinc-600 text-[11px] font-medium max-w-[280px] leading-relaxed">
            By joining, you agree to Nexus{' '}
            <span className="text-zinc-400 hover:text-white cursor-pointer transition-colors underline underline-offset-4 decoration-white/10">Terms</span>
            {' '}and{' '}
            <span className="text-zinc-400 hover:text-white cursor-pointer transition-colors underline underline-offset-4 decoration-white/10">Privacy Policy</span>.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
