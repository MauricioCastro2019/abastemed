import { Heart, Activity, Moon, Stethoscope, Pill, Users } from 'lucide-react'

const servicios = [
  {
    icon: Stethoscope,
    titulo: 'Enfermería a domicilio',
    descripcion:
      'Atención profesional y personalizada en la comodidad de tu hogar. Cuidado integral adaptado a cada paciente.',
    color: 'text-[#2AABBF]',
    bg: 'bg-[#2AABBF]/10 group-hover:bg-[#2AABBF]/20',
  },
  {
    icon: Pill,
    titulo: 'Aplicación de medicamentos',
    descripcion:
      'Administración segura e higienica de medicamentos orales, intravenosos e intramusculares con control riguroso.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 group-hover:bg-emerald-400/20',
  },
  {
    icon: Users,
    titulo: 'Acompañamiento y cuidado',
    descripcion:
      'Bienestar físico y emocional para el paciente. Presencia constante, apoyo y compañía de calidad.',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 group-hover:bg-purple-400/20',
  },
  {
    icon: Activity,
    titulo: 'Rehabilitación en casa',
    descripcion:
      'Terapias y ejercicios personalizados en tu hogar para una recuperación efectiva y sin traslados.',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 group-hover:bg-amber-400/20',
  },
  {
    icon: Heart,
    titulo: 'Atención postoperatoria',
    descripcion:
      'Recuperación segura y monitoreada después de cirugías: curaciones, signos vitales y cuidado de heridas.',
    color: 'text-rose-400',
    bg: 'bg-rose-400/10 group-hover:bg-rose-400/20',
  },
  {
    icon: Moon,
    titulo: 'Enfermería nocturna',
    descripcion:
      'Turnos nocturnos para que toda la familia descanse sabiendo que hay una profesional al cuidado.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/10 group-hover:bg-indigo-400/20',
  },
]

export default function LandingServicios() {
  return (
    <section id="servicios" className="bg-[#F5F5F0] py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[#2AABBF] font-semibold text-sm uppercase tracking-widest">
            Nuestros Servicios
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1B2B4B] mt-2">
            Cuidado profesional para cada necesidad
          </h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto leading-relaxed">
            Contamos con enfermeras especializadas para cada situación. Encontramos la profesional
            que mejor se adapte al caso de tu familiar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicios.map(({ icon: Icon, titulo, descripcion, color, bg }) => (
            <div
              key={titulo}
              className="group bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:-translate-y-1"
            >
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4 transition-colors`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <h3 className="font-bold text-[#1B2B4B] text-lg mb-2">{titulo}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{descripcion}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
