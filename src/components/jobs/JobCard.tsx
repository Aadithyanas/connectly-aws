'use client'

import React from 'react'
import { MapPin, Building2, ExternalLink, Calendar, Briefcase } from 'lucide-react'
import { motion } from 'framer-motion'

export interface Job {
  id: string
  title: string
  company_name: string
  company_logo?: string
  location: string
  job_type: string
  description: string
  apply_link: string
  salary_range?: string
  created_at: string
}

interface JobCardProps {
  job: Job
}

export default function JobCard({ job }: JobCardProps) {
  const handleApply = () => {
    window.open(job.apply_link, '_blank', 'noopener,noreferrer')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-[#bc9dff]/30 transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        {/* Company Logo Placeholder */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#bc9dff]/20 to-white/[0.05] flex items-center justify-center border border-white/[0.05] flex-shrink-0">
          {job.company_logo ? (
            <img src={job.company_logo} alt={job.company_name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <Building2 className="w-6 h-6 text-[#bc9dff]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-white truncate group-hover:text-[#bc9dff] transition-colors">
              {job.title}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[#bc9dff]/10 text-[#bc9dff] text-[10px] font-bold uppercase tracking-wider">
              {job.job_type}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1 text-zinc-400 text-sm">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              {job.company_name}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {job.location}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-zinc-500 text-sm line-clamp-2 leading-relaxed">
          {job.description}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
          <Calendar className="w-3 h-3" />
          Posted on {formatDate(job.created_at)}
        </div>

        <button
          onClick={handleApply}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#bc9dff] text-black text-xs font-bold hover:bg-[#a886f0] active:scale-95 transition-all"
        >
          Apply Now
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}
