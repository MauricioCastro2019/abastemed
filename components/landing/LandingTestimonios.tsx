import { Star, Quote } from 'lucide-react'

const testimonios = [
  {
    nombre: 'María Guadalupe R.',
    rol: 'Hija de paciente',
    texto:
      'Mi mamá necesitaba cuidado después de su operación de cadera. La enfermera que nos asignaron fue increíble, muy atenta y profesional. Mi familia podía trabajar tranquila sabiendo que mamá estaba en buenas manos.',
    estrellas: 5,
    inicial: 'M',
    color: 'bg-rose-500',
  },
  {
    nombre: 'Roberto Sandoval',
    rol: 'Paciente post-quirúrgico',
    texto:
      'Me mandaron a casa después de una cirugía y necesitaba cuidados especializados. Abastemed me asignó una enfermera en menos de un día. El seguimiento, la puntualidad y la actitud fueron excelentes en todo momento.',
    estrellas: 5,
    inicial: 'R',
    color: 'bg-[#2AABBF]',
  },
  {
    nombre: 'Familia Martínez Herrera',
    rol: 'Cuidado de adulto mayor',
    texto:
      'Llevamos meses con el servicio para nuestro papá. La enfermera es parte de la familia ahora. El nivel de compromiso y cariño que tiene con él nos tiene muy agradecidos. 100% recomendable.',
    estrellas: 5,
    inicial: 'F',
    color: 'bg-indigo-500',
  },
]

export default function LandingTestimonios() {
  return (
    <section id="testimonios" className="bg-[#F5F5F0] py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-[#2AABBF] font-semibold text-sm uppercase tracking-widest">
            Testimonios
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1B2B4B] mt-2">
            Familias que ya confían en nosotros
          </h2>
          <p className="text-gray-500 mt-4 max-w-md mx-auto">
            La tranquilidad de nuestros clientes es la mejor carta de presentación.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonios.map(({ nombre, rol, texto, estrellas, inicial, color }) => (
            <div
              key={nombre}
              className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col"
            >
              {/* Comillas decorativas */}
              <Quote className="h-8 w-8 text-[#2AABBF]/20 mb-4 -ml-1" />

              {/* Estrellas */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: estrellas }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Texto */}
              <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-6">
                &ldquo;{texto}&rdquo;
              </p>

              {/* Autor */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div
                  className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                >
                  {inicial}
                </div>
                <div>
                  <div className="font-semibold text-[#1B2B4B] text-sm">{nombre}</div>
                  <div className="text-gray-400 text-xs">{rol}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
