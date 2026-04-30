'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Shield, Zap, Lock, MessageCircle, ArrowRight, Globe, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import Footer from '@/components/Footer'
import RotatingEarth from '@/components/ui/wireframe-dotted-globe'

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/chat')
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#bc9dff]/30 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#bc9dff] flex items-center justify-center shadow-[0_0_20px_rgba(188,157,255,0.5)]">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-black" strokeWidth={2.5} />
            </div>
            <span className="text-lg sm:text-xl font-black tracking-tight text-white">Connectly</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">Features</Link>
            <Link href="#security" className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">Security</Link>
            <Link href="/login" className="px-5 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-[#bc9dff] transition-all active:scale-95">
              Launch App
            </Link>
          </div>

          {/* Mobile nav CTA */}
          <Link href="/login" className="md:hidden px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white text-sm font-bold">
            Launch
          </Link>
        </div>
      </nav>

      <main className="flex-grow flex flex-col">
        {/* ─── FULL-SCREEN HERO ─── */}
        <section className="relative min-h-screen flex flex-col lg:flex-row">
          
          {/* Ambient background glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[20%] left-[15%] w-[400px] h-[400px] bg-[#bc9dff]/8 rounded-full blur-[120px]" />
            <div className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] bg-[#bc9dff]/5 rounded-full blur-[160px]" />
          </div>

          {/* ── LEFT PANEL – Text Content ── */}
          <div className="relative z-10 flex-1 flex items-center justify-center pt-20 lg:pt-0 px-6 sm:px-10">
            <div className="w-full max-w-xl space-y-8 text-center">

              {/* Live Badge */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-md"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#bc9dff] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#bc9dff]" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#bc9dff]">New Horizon Platform</span>
              </motion.div>

              {/* Brand name – HUGE */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
              >
                <h1
                  className="font-black tracking-[-0.05em] leading-[0.88] text-[clamp(3.5rem,8vw,7rem)] whitespace-nowrap animate-shine"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 20%, #bc9dff 60%, #ffffff 90%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Connectly
                </h1>
              </motion.div>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-base sm:text-lg text-zinc-400 font-medium leading-relaxed max-w-md mx-auto"
              >
                Where ambitious students connect with verified industry professionals.{' '}
                <span className="text-white font-semibold">Real conversations. Real growth.</span>
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3"
              >
                <Link
                  href="/login"
                  className="group relative w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white text-black font-black text-base hover:bg-[#bc9dff] transition-all active:scale-95"
                >
                  <Users className="w-5 h-5" />
                  Join as Student
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </Link>
                
                <Link
                  href="/login"
                  className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.12] text-white font-bold text-base hover:bg-white/[0.1] hover:border-[#bc9dff]/40 transition-all active:scale-95"
                >
                  <Globe className="w-4 h-4 text-[#bc9dff]" />
                  Join as Professional
                </Link>
              </motion.div>

              {/* Trust pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex flex-wrap items-center justify-center gap-3 pt-2"
              >
                {[
                  { icon: <Lock className="w-3.5 h-3.5" />, label: 'End-to-End Encrypted' },
                  { icon: <Zap className="w-3.5 h-3.5" />, label: 'Real-time' },
                  { icon: <Shield className="w-3.5 h-3.5" />, label: 'Verified Mentors' },
                ].map((badge, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-xs font-semibold hover:text-white hover:border-[#bc9dff]/30 transition-colors">
                    <span className="text-[#bc9dff]">{badge.icon}</span>
                    {badge.label}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>

          {/* ── DIVIDER (desktop only) ── */}
          <div className="hidden lg:block absolute left-1/2 top-[15%] bottom-[15%] w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

          {/* ── RIGHT PANEL – Globe ── */}
          <div className="relative z-10 flex-1 flex items-center justify-center py-12 lg:py-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: 'circOut', delay: 0.2 }}
              className="w-full flex items-center justify-center"
              style={{ maxWidth: 'min(95vw, 95vh, 1800px)' }}
            >
              <RotatingEarth
                width={4500}
                height={4500}
                className="w-full"
              />
            </motion.div>
          </div>

        </section>

        {/* ─── FEATURES SECTION ─── */}
        <section id="features" className="py-24 sm:py-32 border-t border-white/[0.06]">
          <div className="max-w-screen-xl mx-auto px-6 lg:px-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">Why Connectly?</h2>
              <p className="text-zinc-500 text-lg max-w-xl mx-auto">Built for the serious conversations that shape careers.</p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <Lock className="w-6 h-6" />,
                  title: 'Private & Secure',
                  desc: 'End-to-end encrypted conversations with robust row-level security. Your data stays yours.',
                },
                {
                  icon: <Zap className="w-6 h-6" />,
                  title: 'Real-time Sync',
                  desc: 'Instant message delivery powered by Supabase Realtime. Zero lag, zero friction.',
                  highlight: true,
                },
                {
                  icon: <Users className="w-6 h-6" />,
                  title: 'Verified Mentors',
                  desc: 'Connect with experts from top companies you can trust, vetted through our review system.',
                },
              ].map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className={`group relative p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-1 ${
                    f.highlight
                      ? 'bg-[#bc9dff]/[0.06] border-[#bc9dff]/20 hover:border-[#bc9dff]/40'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
                    f.highlight
                      ? 'bg-[#bc9dff]/20 text-[#bc9dff] shadow-[0_0_20px_rgba(188,157,255,0.2)]'
                      : 'bg-white/[0.05] text-zinc-400 group-hover:text-white'
                  } transition-colors`}>
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-zinc-500 leading-relaxed text-sm">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
