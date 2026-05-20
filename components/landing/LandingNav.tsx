import Link from 'next/link'
import { Phone } from 'lucide-react'
import { CONTACT } from '@/lib/landing-config'

export default function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1B2B4B]/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.svg" alt="Abastemed logo" className="h-9 w-auto" />
          <span className="text-white font-bold text-lg tracking-tight">Abastemed</span>
        </Link>

        <div className="flex items-center gap-5">
          <a
            href={CONTACT.phoneHref}
            className="hidden sm:flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
          >
            <Phone className="h-4 w-4 text-[#2AABBF]" />
            {CONTACT.phone}
          </a>
          <Link
            href="#servicios"
            className="hidden md:block text-sm text-white/60 hover:text-white transition-colors"
          >
            Servicios
          </Link>
          <Link
            href="/login"
            className="text-sm text-white/80 hover:text-white transition-colors border border-white/20 hover:border-[#2AABBF]/60 hover:bg-[#2AABBF]/10 px-4 py-2 rounded-lg"
          >
            Portal Clientes
          </Link>
        </div>
      </div>
    </nav>
  )
}
