import Link from 'next/link'
import { MapPin, Phone, Mail } from 'lucide-react'
import { CONTACT } from '@/lib/landing-config'

const servicios = [
  'Cuidado del Adulto Mayor',
  'Recuperación Post-Quirúrgica',
  'Enfermería Nocturna',
  'Cuidado Especializado',
  'Acompañamiento Hospitalario',
]

export default function LandingFooter() {
  return (
    <footer className="bg-[#0D1F3C] text-white/50 py-14 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Marca */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.svg" alt="Abastemed" className="h-8 w-auto" />
              <span className="text-white font-bold text-lg">Abastemed</span>
            </div>
            <p className="text-sm leading-relaxed">
              Agencia de enfermería profesional a domicilio en León, Guanajuato. Cuidamos a tus
              seres queridos con dedicación y experiencia.
            </p>
          </div>

          {/* Servicios */}
          <div>
            <h4 className="text-white font-semibold mb-4">Servicios</h4>
            <ul className="space-y-2 text-sm">
              {servicios.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#2AABBF] flex-shrink-0 mt-0.5" />
                León, Guanajuato, México
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#2AABBF] flex-shrink-0" />
                <a href={CONTACT.phoneHref} className="hover:text-white transition-colors">
                  {CONTACT.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#2AABBF] flex-shrink-0" />
                <a href={`mailto:${CONTACT.email}`} className="hover:text-white transition-colors">
                  {CONTACT.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Slogan */}
        <div className="text-center py-6 border-t border-white/8 mb-2">
          <p className="text-white/40 text-sm italic">
            Cuidamos a los tuyos <span className="text-[#2AABBF] not-italic font-medium">como en casa</span> ♡
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span>© {new Date().getFullYear()} Abastemed. Todos los derechos reservados.</span>
          <Link href="/login" className="text-[#2AABBF] hover:text-white transition-colors">
            Portal de acceso →
          </Link>
        </div>
      </div>
    </footer>
  )
}
