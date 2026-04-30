'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/utils/api'
import { useAuth } from '@/context/AuthContext'

export interface Post {
  id: string
  user_id: string
  title?: string
  content: string
  media_urls: string[]
  media_types: string[]
  category: 'project' | 'workshop' | 'hiring' | 'tip' | 'general_tech'
  likes_count: number
  comments_count: number
  created_at: string
  user?: {
    name: string
    avatar_url: string
    role: string
  }
  is_liked?: boolean
  quoted_post_id?: string | null
  quoted_post?: {
    id: string
    content: string
    media_urls: string[]
    media_types: string[]
    created_at: string
    user?: {
      name: string
      avatar_url: string
      role: string
    }
  } | null
}

export interface PostComment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  reply_to_id?: string
  user?: {
    name: string
    avatar_url: string
  }
  replied_to?: {
    content: string
    profiles: {
      name: string
    }
  }
}

export function usePosts(filterUserId?: string, filterRole?: string) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const POSTS_PER_PAGE = 20

  useEffect(() => {
    if (!filterUserId) {
      try {
        const saved = localStorage.getItem('tech_feed_cache')
        if (saved) {
          setPosts(JSON.parse(saved))
        }
      } catch (e) {}
    }
  }, [filterUserId])

  const [activeComments, setActiveComments] = useState<Record<string, PostComment[]>>({})
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({})

  const { user, loading: authLoading } = useAuth()

  const postsRef = useRef<Post[]>(posts)
  useEffect(() => {
    postsRef.current = posts
  }, [posts])

  const fetchPosts = useCallback(async (isSilent = false, isLoadMore = false) => {
    if (authLoading) return
    
    if (!user) {
      if (!isSilent) setLoading(false)
      return
    }

    const currentPage = isLoadMore ? page + 1 : 0
    if (!isSilent && !isLoadMore && postsRef.current.length === 0) setLoading(true)
    
    try {
      let queryUrl = `/posts/feed?limit=${POSTS_PER_PAGE}&offset=${currentPage * POSTS_PER_PAGE}`
      if (filterUserId) queryUrl += `&filterUserId=${filterUserId}`
      if (filterRole) queryUrl += `&filterRole=${filterRole}`

      const formatted = await api.get(queryUrl)

      if (formatted.length < POSTS_PER_PAGE) {
        setHasMore(false)
      } else {
        setHasMore(true)
      }

      const now = Date.now()
      const calculateScore = (p: Post) => {
        if (filterUserId) return new Date(p.created_at).getTime()
        
        const ageHours = (now - new Date(p.created_at).getTime()) / (1000 * 60 * 60)
        const engagement = ((p.likes_count || 0) * 1) + ((p.comments_count || 0) * 2) + 1
        const gravity = 1.5
        return engagement / Math.pow(ageHours + 2, gravity)
      }

      const rawList = isLoadMore ? [...postsRef.current, ...formatted] : formatted;
      // Deduplicate by ID to prevent duplicate key errors
      const seenIds = new Set();
      const newPostsList = rawList.filter((p: Post) => {
        if (seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
      });
      
      const ranked = [...newPostsList].sort((a, b) => {
        return calculateScore(b) - calculateScore(a)
      })

      setPosts(ranked)
      setNewPostsCount(0)
      if (isLoadMore) setPage(currentPage)
      
      if (!filterUserId && !isLoadMore) {
        localStorage.setItem('tech_feed_cache', JSON.stringify(formatted))
      }

      window.dispatchEvent(new CustomEvent('app:refresh', { detail: { source: 'usePosts' } }))
    } catch (err) {
      console.error('Error fetching posts:', err)
    } finally {
      setLoading(false)
    }
  }, [user, authLoading, filterUserId, filterRole, page])

  const checkForNewPosts = useCallback(async () => {
    if (!user || postsRef.current.length === 0 || filterUserId) return

    const allTimes = postsRef.current.map(p => new Date(p.created_at).getTime())
    const latestPostTime = new Date(Math.max(...allTimes)).toISOString()
    
    try {
      const data = await api.get(`/posts/check-new?since=${latestPostTime}`)
      if (data && data.count > 0) {
        setNewPostsCount(data.count)
      }
    } catch (err) {
    }
  }, [user, filterUserId])

  useEffect(() => {
    if (authLoading || !user) return

    fetchPosts()

    let intervalId: NodeJS.Timeout

    const startPolling = () => {
      const isIdle = document.visibilityState === 'hidden'
      const interval = isIdle ? 60000 : 15000 
      
      intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          checkForNewPosts()
        }
      }, interval)
    }

    startPolling()

    const handleVisibilityChange = () => {
      clearInterval(intervalId)
      if (document.visibilityState === 'visible') {
        checkForNewPosts() 
      }
      startPolling()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user, authLoading, fetchPosts, checkForNewPosts])

  const fetchComments = async (postId: string) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }))
    try {
      const data = await api.get(`/posts/${postId}/comments`)
      setActiveComments(prev => ({ ...prev, [postId]: data }))
    } catch (err) {
      console.error('Failed to fetch comments:', err)
      setActiveComments(prev => ({ ...prev, [postId]: [] }))
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }))
    }
  }

  const addComment = async (postId: string, content: string, replyToId?: string) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const data = await api.post(`/posts/${postId}/comment`, {
        content: content.trim(),
        reply_to_id: replyToId
      })

      await fetchComments(postId)
      return { data, error: null }
    } catch (err: any) {
      console.error('Add comment error:', err)
      return { data: null, error: err.message || 'Failed to add comment' }
    }
  }

  const toggleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!user) return

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          is_liked: !currentlyLiked,
          likes_count: currentlyLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1
        }
      }
      return p
    }))

    try {
      await api.post(`/posts/${postId}/like`, {})
    } catch (err) {
      console.error('Like toggle failed:', err)
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            is_liked: currentlyLiked,
            likes_count: currentlyLiked ? p.likes_count : Math.max(0, p.likes_count - 1)
          }
        }
        return p
      }))
    }
  }

  const createPost = async (payload: { title?: string, content: string, media_urls: string[], media_types: string[], category: string, quoted_post_id?: string }) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const result = await api.post('/posts/create', payload)
      return { data: result.post, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const updatePost = async (postId: string, payload: { title?: string, content: string }) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      const data = await api.patch(`/posts/${postId}`, payload)
      await fetchPosts(true)
      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: err.message }
    }
  }

  const deletePost = async (postId: string) => {
    if (!user) return { error: 'Not authenticated' }

    try {
      await api.delete(`/posts/${postId}`)
      setPosts(prev => prev.filter(p => p.id !== postId))
      return { error: null }
    } catch (err: any) {
      return { error: err.message }
    }
  }

  return { 
    posts, 
    loading, 
    newPostsCount,
    hasMore,
    loadMore: () => fetchPosts(true, true),
    toggleLike, 
    createPost,
    updatePost,
    deletePost,
    refresh: () => { setPage(0); setHasMore(true); fetchPosts(); },
    fetchComments,
    addComment,
    activeComments,
    loadingComments
  }
}
