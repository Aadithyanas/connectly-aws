'use client'

import React, { useState, useEffect } from 'react'
import { Search, MapPin, Building2, Plus, Briefcase, Filter, X, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/utils/api'
import JobCard, { Job } from './JobCard'
import PostJobModal from './PostJobModal'
import { useAuth } from '@/context/AuthContext'

export default function JobSection() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  
  // Filters
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [company, setCompany] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('title', search)
      if (location) params.append('location', location)
      if (company) params.append('company', company)
      
      const data = await api.get(`/jobs?${params.toString()}`)
      setJobs(data)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [search, location, company])

  const clearFilters = () => {
    setSearch('')
    setLocation('')
    setCompany('')
  }

  const isProfessional = profile?.role === 'professional'

  return (
    <div className="flex flex-col h-full bg-black text-white relative">
      {/* Header */}
      <header className="px-6 py-6 border-b border-white/[0.06] bg-black/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#bc9dff]/10 flex items-center justify-center border border-[#bc9dff]/20">
              <Briefcase className="w-5 h-5 text-[#bc9dff]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Opportunities</h1>
              <p className="text-zinc-500 text-xs font-medium">Find your next career move</p>
            </div>
          </div>

          {isProfessional && (
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#bc9dff] text-black text-sm font-bold hover:bg-[#a886f0] active:scale-95 transition-all shadow-[0_0_20px_rgba(188,157,255,0.2)]"
            >
              <Plus className="w-4 h-4" />
              Post Job
            </button>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by role or title..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#bc9dff]/50 transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-xl border transition-all ${showFilters ? 'bg-[#bc9dff] text-black border-[#bc9dff]' : 'bg-white/[0.04] text-zinc-400 border-white/10 hover:border-white/20'}`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Location..."
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#bc9dff]/30 transition-all"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Company..."
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#bc9dff]/30 transition-all"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <button 
                  onClick={clearFilters}
                  className="text-[11px] font-bold text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear All Filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 border-2 border-[#bc9dff]/20 border-t-[#bc9dff] rounded-full animate-spin" />
            <p className="text-zinc-500 text-sm font-medium">Scanning for opportunities...</p>
          </div>
        ) : jobs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto pb-24">
            {jobs.map(job => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-80 text-center px-6">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6">
              <Briefcase className="w-8 h-8 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No jobs found</h3>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto">
              {search || location || company 
                ? "Try adjusting your filters to find more results." 
                : "Check back later for new opportunities."}
            </p>
            {(search || location || company) && (
              <button 
                onClick={clearFilters}
                className="mt-6 px-6 py-2 rounded-xl bg-white/5 text-white text-sm font-bold hover:bg-white/10 transition-all"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      <PostJobModal 
        isOpen={isPostModalOpen} 
        onClose={() => setIsPostModalOpen(false)} 
        onJobCreated={fetchJobs} 
      />
    </div>
  )
}
