'use client'

import React, { useState } from 'react'
import { X, Building2, MapPin, Briefcase, Link as LinkIcon, DollarSign, AlignLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '@/utils/api'

interface PostJobModalProps {
  isOpen: boolean
  onClose: () => void
  onJobCreated: () => void
}

export default function PostJobModal({ isOpen, onClose, onJobCreated }: PostJobModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    company_name: '',
    location: '',
    job_type: 'Full-time',
    description: '',
    apply_link: '',
    salary_range: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/jobs', formData)
      onJobCreated()
      onClose()
      setFormData({
        title: '',
        company_name: '',
        location: '',
        job_type: 'Full-time',
        description: '',
        apply_link: '',
        salary_range: ''
      })
    } catch (error) {
      console.error('Error posting job:', error)
      alert('Failed to post job. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Post a Vacancy</h2>
                <p className="text-zinc-500 text-sm">Fill in the details to find the right talent.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Job Title</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      required
                      type="text"
                      placeholder="e.g. Senior Frontend Engineer"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#bc9dff]/50 transition-all"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Company</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        required
                        type="text"
                        placeholder="Company Name"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#bc9dff]/50 transition-all"
                        value={formData.company_name}
                        onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        required
                        type="text"
                        placeholder="e.g. Remote, Bangalore"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#bc9dff]/50 transition-all"
                        value={formData.location}
                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Job Type</label>
                    <select
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-[#bc9dff]/50 transition-all appearance-none cursor-pointer"
                      value={formData.job_type}
                      onChange={e => setFormData({ ...formData, job_type: e.target.value })}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Salary Range</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="e.g. $80k - $120k"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#bc9dff]/50 transition-all"
                        value={formData.salary_range}
                        onChange={e => setFormData({ ...formData, salary_range: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Apply Link</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      required
                      type="url"
                      placeholder="https://company.com/careers/job-123"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#bc9dff]/50 transition-all"
                      value={formData.apply_link}
                      onChange={e => setFormData({ ...formData, apply_link: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Description</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-3 top-4 w-4 h-4 text-zinc-500" />
                    <textarea
                      required
                      rows={4}
                      placeholder="Briefly describe the role and requirements..."
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#bc9dff]/50 transition-all resize-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#bc9dff] text-black font-black text-lg hover:bg-[#a886f0] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-[0_10px_20px_rgba(188,157,255,0.2)]"
              >
                {loading ? 'Posting...' : 'Post Job'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
