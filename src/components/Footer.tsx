import React from 'react'
import { MessageCircle, Link as LinkIcon, Mail } from 'lucide-react'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="w-full bg-black border-t border-white/[0.05] py-12 md:py-16 mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#bc9dff] flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-black" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-black tracking-tight text-white">Connectly</span>
            </div>
            <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
              The professional bridge for modern ambitious students. Connect, collaborate, and grow with verified industry mentors.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link href="#" className="p-2 rounded-lg bg-white/[0.03] text-zinc-500 hover:text-white transition-colors">
                <MessageCircle size={18} />
              </Link>
              <Link href="#" className="p-2 rounded-lg bg-white/[0.03] text-zinc-500 hover:text-white transition-colors">
                <Mail size={18} />
              </Link>
              <Link href="#" className="p-2 rounded-lg bg-white/[0.03] text-zinc-500 hover:text-white transition-colors">
                <LinkIcon size={18} />
              </Link>
            </div>
          </div>

          {/* Links Columns */}
          <div className="space-y-6">
            <h4 className="text-white font-bold text-sm uppercase tracking-widest">Platform</h4>
            <ul className="space-y-4">
              <li><Link href="/login" className="text-zinc-500 hover:text-[#bc9dff] text-sm transition-colors font-medium">Join as Student</Link></li>
              <li><Link href="/login" className="text-zinc-500 hover:text-[#bc9dff] text-sm transition-colors font-medium">Join as Professional</Link></li>
              <li><Link href="#" className="text-zinc-500 hover:text-[#bc9dff] text-sm transition-colors font-medium">Discovery Feed</Link></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h4 className="text-white font-bold text-sm uppercase tracking-widest">Legal</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-zinc-500 hover:text-[#bc9dff] text-sm transition-colors font-medium">Privacy Policy</Link></li>
              <li><Link href="#" className="text-zinc-500 hover:text-[#bc9dff] text-sm transition-colors font-medium">Terms of Service</Link></li>
              <li><Link href="#" className="text-zinc-500 hover:text-[#bc9dff] text-sm transition-colors font-medium">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.03] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-zinc-600 text-xs font-medium tracking-wide">
            © {new Date().getFullYear()} Connectly AI. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-zinc-700 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span>Secure</span>
            <span className="w-1 h-1 rounded-full bg-zinc-800" />
            <span>Encrypted</span>
            <span className="w-1 h-1 rounded-full bg-zinc-800" />
            <span>Private</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
