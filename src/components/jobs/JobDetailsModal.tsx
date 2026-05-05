'use client'

import React from 'react'
import { X, MapPin, Building2, ExternalLink, Calendar, Briefcase, DollarSign } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Job } from './JobCard'

interface JobDetailsModalProps {
  job: Job | null
  onClose: () => void
}

export default function JobDetailsModal({ job, onClose }: JobDetailsModalProps) {
  if (!job) return null

  const handleApply = () => {
    window.open(job.apply_link, '_blank', 'noopener,noreferrer')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <AnimatePresence>
      {job && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header / Banner */}
            <div className="relative h-32 bg-gradient-to-br from-[#bc9dff]/20 to-zinc-800 border-b border-white/5">
              <button 
                onClick={onClose} 
                className="absolute top-6 right-6 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="absolute -bottom-8 left-8">
                <div className="w-20 h-20 rounded-3xl bg-zinc-900 border-4 border-zinc-900 shadow-2xl flex items-center justify-center overflow-hidden">
                  {job.company_logo ? (
                    <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-10 h-10 text-[#bc9dff]" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-8 pt-12">
              <div className="space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h2 className="text-3xl font-black text-white leading-tight">{job.title}</h2>
                    <div className="flex items-center gap-2">
                      {job.source_platform && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          job.source_platform === 'Connectly' ? 'bg-[#bc9dff]/10 text-[#bc9dff]' :
                          job.source_platform === 'LinkedIn' ? 'bg-[#0077b5]/10 text-[#0077b5]' :
                          job.source_platform === 'Indeed' ? 'bg-[#2164f3]/10 text-[#2164f3]' :
                          job.source_platform === 'Glassdoor' ? 'bg-[#0caa41]/10 text-[#0caa41]' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {job.source_platform}
                        </span>
                      )}
                      <span className="px-3 py-1 rounded-full bg-white/5 text-zinc-400 text-xs font-bold uppercase tracking-wider">
                        {job.job_type}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-zinc-400 font-medium">
                    <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                      <Building2 className="w-4 h-4 text-[#bc9dff]" />
                      {job.company_name}
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                      <MapPin className="w-4 h-4 text-[#bc9dff]" />
                      {job.location}
                    </span>
                    {job.salary_range && (
                      <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                        <DollarSign className="w-4 h-4 text-[#bc9dff]" />
                        {job.salary_range}
                      </span>
                    )}
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-[#bc9dff]" />
                    Job Description
                  </h3>
                  <div className="text-zinc-400 leading-relaxed whitespace-pre-wrap">
                    {job.description}
                  </div>
                </div>

                <div className="flex items-center gap-2 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    Posted on {formatDate(job.created_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-zinc-900/50 backdrop-blur-xl">
              <button
                onClick={handleApply}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#bc9dff] text-black font-black text-lg hover:bg-[#a886f0] active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(188,157,255,0.3)]"
              >
                Apply for this position
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
