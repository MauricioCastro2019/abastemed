import { Phone } from 'lucide-react'
import { CONTACT, WA_LINK } from '@/lib/landing-config'

const WaIcon = () => (
  <svg className="h-6 w-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

export default function LandingCTA() {
  return (
    <section className="relative bg-[#1B2B4B] py-24 px-4 overflow-hidden">
      {/* Gradiente decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D1F3C] via-[#1B2B4B] to-[#0B2433] pointer-events-none" />
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#2AABBF]/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Línea decorativa */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-px w-12 bg-[#2AABBF]/40" />
          <span className="text-[#2AABBF] text-sm font-semibold uppercase tracking-widest">
            Contáctanos hoy
          </span>
          <div className="h-px w-12 bg-[#2AABBF]/40" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
          ¿Tu familiar necesita<br />cuidado profesional?
        </h2>
        <p className="text-white/60 text-lg mb-10 leading-relaxed">
          Contáctanos ahora. En menos de 24 horas tenemos a la enfermera
          ideal para tu caso, sin complicaciones.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#25D366] hover:bg-[#1EBC5A] text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-xl shadow-green-600/20 hover:shadow-green-600/35 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
          >
            <WaIcon />
            Escríbenos por WhatsApp
          </a>
          <a
            href={CONTACT.phoneHref}
            className="flex items-center gap-3 text-white font-semibold text-lg hover:text-[#2AABBF] transition-colors"
          >
            <Phone className="h-5 w-5 text-[#2AABBF]" />
            {CONTACT.phone}
          </a>
        </div>

        {/* Nota de respuesta rápida */}
        <p className="text-white/35 text-xs mt-8">
          Respondemos en minutos — disponibles las 24 horas, los 7 días de la semana
        </p>
      </div>
    </section>
  )
}
