import { Phone, Shield, Clock, Star, MapPin } from 'lucide-react'
import { CONTACT, WA_LINK } from '@/lib/landing-config'

const WaIcon = () => (
  <svg className="h-6 w-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

const trust = [
  { icon: Shield, label: 'Enfermeras certificadas y verificadas' },
  { icon: Clock, label: 'Disponibilidad 24/7' },
  { icon: Star, label: '+50 familias atendidas' },
]

export default function LandingHero() {
  return (
    <section className="relative min-h-screen bg-[#0D1F3C] flex flex-col items-center justify-center pt-16 overflow-hidden">
      {/* Gradients decorativos */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D1F3C] via-[#1B2B4B] to-[#0B2433] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#2AABBF]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-[400px] h-[400px] bg-[#2AABBF]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Línea de ECG decorativa */}
      <div className="absolute bottom-24 left-0 right-0 opacity-10 pointer-events-none">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path
            d="M0 30 L200 30 L230 30 L245 5 L260 55 L275 15 L290 30 L440 30 L470 30 L485 10 L500 50 L515 20 L530 30 L700 30 L730 30 L745 5 L760 55 L775 15 L790 30 L1000 30 L1030 30 L1045 8 L1060 52 L1075 18 L1090 30 L1440 30"
            stroke="#2AABBF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Chips */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 bg-[#2AABBF]/15 border border-[#2AABBF]/30 rounded-full px-5 py-2">
            <MapPin className="h-4 w-4 text-[#2AABBF]" />
            <span className="text-[#2AABBF] text-sm font-medium">León, Guanajuato y área metropolitana</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/15 rounded-full px-4 py-2">
            <span className="text-white/70 text-sm">Atención en casa con calidad hospitalaria</span>
          </div>
        </div>

        {/* Título principal */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-[1.1] mb-4 tracking-tight">
          Tu tranquilidad,
        </h1>
        <p className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#2AABBF] leading-[1.1] mb-3 tracking-tight italic">
          nuestra prioridad
        </p>
        <p className="text-white/40 text-base sm:text-lg font-medium mb-6 uppercase tracking-widest">
          Cuidado profesional en casa
        </p>

        {/* Subtítulo */}
        <p className="text-lg sm:text-xl text-white/65 max-w-2xl mx-auto mb-10 leading-relaxed">
          Brindamos atención profesional en la comodidad de tu hogar,
          con <strong className="text-white/90 font-semibold">calidez humana</strong> y seguimiento confiable.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 bg-[#25D366] hover:bg-[#1EBC5A] text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-xl shadow-green-600/20 hover:shadow-green-600/35 hover:-translate-y-0.5 w-full sm:w-auto justify-center"
          >
            <WaIcon />
            Escríbenos por WhatsApp
          </a>
          <a
            href={CONTACT.phoneHref}
            className="flex items-center gap-3 bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-all border border-white/15 hover:border-white/30 w-full sm:w-auto justify-center"
          >
            <Phone className="h-5 w-5 text-[#2AABBF]" />
            {CONTACT.phone}
          </a>
        </div>

        {/* Indicadores de confianza */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-white/50 text-sm">
          {trust.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-[#2AABBF]" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ola inferior */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 80V50C360 10 720 10 1080 50C1260 70 1380 60 1440 50V80H0Z" fill="#F5F5F0" />
        </svg>
      </div>
    </section>
  )
}
