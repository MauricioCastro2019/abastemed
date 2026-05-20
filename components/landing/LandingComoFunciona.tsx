import { MessageCircle, UserCheck, HeartHandshake } from 'lucide-react'

const pasos = [
  {
    numero: 1,
    icon: MessageCircle,
    titulo: 'Contáctanos',
    descripcion:
      'Escríbenos por WhatsApp o llámanos. Cuéntanos sobre el paciente y el cuidado que necesita. Respondemos en minutos.',
  },
  {
    numero: 2,
    icon: UserCheck,
    titulo: 'Encontramos a la enfermera ideal',
    descripcion:
      'Evaluamos el caso y seleccionamos a la enfermera certificada con la especialización adecuada para tu familiar.',
  },
  {
    numero: 3,
    icon: HeartHandshake,
    titulo: 'Iniciamos el cuidado',
    descripcion:
      'La enfermera se presenta puntual. Tú tienes comunicación directa y un reporte de actividades en todo momento.',
  },
]

export default function LandingComoFunciona() {
  return (
    <section id="como-funciona" className="bg-white py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[#2AABBF] font-semibold text-sm uppercase tracking-widest">
            Simple y rápido
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1B2B4B] mt-2">
            ¿Cómo funciona?
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto leading-relaxed">
            En menos de 24 horas puedes tener una enfermera profesional al cuidado de tu familiar.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6">
          {/* Línea conectora (solo desktop) */}
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+2.5rem)] right-[calc(16.67%+2.5rem)] h-px bg-gradient-to-r from-[#2AABBF]/20 via-[#2AABBF]/60 to-[#2AABBF]/20" />

          {pasos.map(({ numero, icon: Icon, titulo, descripcion }) => (
            <div key={numero} className="relative flex flex-col items-center text-center">
              {/* Ícono con número */}
              <div className="relative mb-6 z-10">
                <div className="w-20 h-20 bg-[#1B2B4B] rounded-2xl flex items-center justify-center shadow-xl shadow-[#1B2B4B]/20">
                  <Icon className="h-9 w-9 text-[#2AABBF]" />
                </div>
                <span className="absolute -top-3 -right-3 w-7 h-7 bg-[#2AABBF] text-white text-xs font-extrabold rounded-full flex items-center justify-center shadow-lg">
                  {numero}
                </span>
              </div>
              <h3 className="font-bold text-[#1B2B4B] text-lg mb-3">{titulo}</h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{descripcion}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
