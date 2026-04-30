'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react'
import { api } from '@/utils/api'
import { useRouter } from 'next/navigation'

export interface User {
  id: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null
  profile: any | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  fetchProfile: () => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // fetchProfile: fetches user from backend using stored token.
  // Used by ChatLayout for retry hydration after mount.
  // Returns the user object on success. Throws on auth errors.
  const fetchProfile = useCallback(async (): Promise<any> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      throw new Error('No token')
    }

    const data = await api.get('/auth/me')

    if (data && data.user) {
      setProfile(data.user)
      setUser({ id: data.user.id, email: data.user.email, name: data.user.name })
      return data.user
    }

    throw new Error('No user data returned from /auth/me')
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      try { await fetchProfile() } catch (_) {}
    }
  }, [user, fetchProfile])

  const initLock = useRef(false)

  useEffect(() => {
    if (initLock.current) return
    initLock.current = true

    const initAuth = async () => {
      let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

      // Sanitise stringified nulls from old localStorage state
      if (token === 'null' || token === 'undefined') {
        localStorage.removeItem('token')
        token = null
      }

      console.log('[Auth] initAuth - Token found:', !!token)

      if (!token) {
        // No session — commit user+loading together in one synchronous block
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      // Token exists — fetch user data directly here so that setUser and
      // setLoading(false) are committed in the same React render batch.
      // Previously delegating to fetchProfile() caused setUser and
      // setLoading to fire in separate async boundaries, creating a brief
      // window where loading=false but user=null — which made ChatLayout
      // bounce the user back to /login.
      try {
        const data = await api.get('/auth/me')

        if (data && data.user) {
          // Both state updates in the same synchronous block → single React flush
          setProfile(data.user)
          setUser({ id: data.user.id, email: data.user.email, name: data.user.name })
          setLoading(false)
          return
        }

        // Received a response but it had no user object
        throw new Error('No user data returned from /auth/me')
      } catch (err: any) {
        const msg = err?.message?.toLowerCase() ?? ''
        const isDefinitiveAuthError =
          msg.includes('access token is missing') ||
          msg.includes('invalid or expired token') ||
          msg.includes('401') ||
          msg.includes('403')

        if (isDefinitiveAuthError) {
          // Token is genuinely invalid — wipe it
          console.warn('[Auth] initAuth: definitive auth error, clearing token:', msg)
          localStorage.removeItem('token')
          setUser(null)
          setProfile(null)
        } else {
          // Network/server hiccup — keep token so ChatLayout can retry.
          // Leave user=null; ChatLayout will show a retry prompt.
          console.warn('[Auth] initAuth: backend unreachable, preserving token:', msg)
        }

        setLoading(false)
      }
    }

    initAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    localStorage.removeItem('token')
    setUser(null)
    setProfile(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
