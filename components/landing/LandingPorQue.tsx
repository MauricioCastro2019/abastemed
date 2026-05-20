import { Award, Clock, Shield, Bell, MapPin, Heart } from 'lucide-react'

const razones = [
  {
    icon: Award,
    titulo: 'Profesionales capacitados',
    descripcion:
      'Experiencia y vocación a tu servicio. Todo nuestro personal cuenta con cédula profesional y referencias verificadas.',
  },
  {
    icon: Clock,
    titulo: 'Disponibilidad 24/7',
    descripcion:
      'Turnos de día, noche, fines de semana y días festivos. Siempre hay alguien disponible cuando lo necesitas.',
  },
  {
    icon: Shield,
    titulo: 'Seguridad y confianza',
    descripcion:
      'Protocolos de calidad para tu tranquilidad. Verificamos antecedentes y certificaciones de cada profesional.',
  },
  {
    icon: Bell,
    titulo: 'Seguimiento confiable',
    descripcion:
      'Reporte de actividades diario. Tú y tu familia siempre están informados del estado del paciente.',
  },
  {
    icon: MapPin,
    titulo: 'Cobertura en León y zona',
    descripcion:
      'Atendemos León, San Francisco del Rincón, Purísima, Silao y toda el área metropolitana de Guanajuato.',
  },
  {
    icon: Heart,
    titulo: 'Cuidado humano y personalizado',
    descripcion:
      'Más que un servicio, somos tu apoyo. Nos importa el bienestar del paciente y la paz de su familia.',
  },
]

export default function LandingPorQue() {
  return (
    <section id="nosotros" className="bg-[#1B2B4B] py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[#2AABBF] font-semibold text-sm uppercase tracking-widest">
            Por qué elegirnos
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
            La agencia de confianza<br className="hidden sm:block" /> en León, Guanajuato
          </h2>
          <p className="text-white/50 mt-4 max-w-xl mx-auto leading-relaxed">
            Más que un servicio, somos un aliado para tu familia cuando más lo necesitan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {razones.map(({ icon: Icon, titulo, descripcion }) => (
            <div
              key={titulo}
              className="flex gap-4 p-6 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/8 hover:border-[#2AABBF]/30 transition-all group"
            >
              <div className="flex-shrink-0 w-11 h-11 bg-[#2AABBF]/15 group-hover:bg-[#2AABBF]/25 rounded-xl flex items-center justify-center transition-colors">
                <Icon className="h-5 w-5 text-[#2AABBF]" />
              </div>
              <div>
                <h3 className="font-bold text-white mb-1.5">{titulo}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{descripcion}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
