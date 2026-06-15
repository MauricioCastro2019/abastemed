import { getRecibo } from '@/lib/actions/recibos'
import { EliminarReciboBtn } from '@/components/admin/recibos/EliminarReciboBtn'
import { SeccionPago } from '@/components/recibos/SeccionPago'
import { getTituloDocumento } from '@/lib/config/pagos'
import { ArrowLeft, Pencil, Printer } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

function formatearFecha(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  return `${d} de ${meses[m - 1]} de ${y}`
}

interface Props {
  params: { id: string }
}

export default async function VerReciboPage({ params }: Props) {
  let recibo
  try {
    recibo = await getRecibo(params.id)
  } catch {
    notFound()
  }

  const items = recibo.recibo_items ?? []

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Barra de acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/recibos"
          className="p-2 rounded-lg text-gray-400 hover:text-[#2AABBF] hover:bg-white transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <span className="flex-1 text-sm text-gray-400">
          {recibo.folio}
        </span>
        <div className="flex gap-2">
          <Link
            href={`/imprimir/recibos/${recibo.id}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
          >
            <Printer size={16} />
            Imprimir / PDF
          </Link>
          <Link
            href={`/recibos/${recibo.id}/editar`}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-all"
            style={{ backgroundColor: '#2AABBF' }}
          >
            <Pencil size={16} />
            Editar
          </Link>
          <EliminarReciboBtn id={recibo.id} />
        </div>
      </div>

      {/* Recibo visual */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Encabezado del recibo */}
        <div className="px-8 py-7" style={{ backgroundColor: '#0B2A44' }}>
          <div className="flex items-start justify-between gap-6">
            {/* Marca */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#178C93' }}
                >
                  <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
                    <path d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4z" fill="white" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-lg tracking-widest leading-none">ABASTEMED</p>
                  <p className="text-xs mt-0.5" style={{ color: '#178C93' }}>Cuidado profesional en casa</p>
                </div>
              </div>
            </div>
            {/* Folio */}
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-1">{getTituloDocumento(recibo.estado)}</p>
              <p className="text-white font-bold text-lg font-mono">{recibo.folio}</p>
            </div>
          </div>
        </div>

        {/* Datos paciente y fecha */}
        <div
          className="px-8 py-4 flex flex-wrap gap-6 border-b border-gray-100"
          style={{ backgroundColor: '#F4F8FA' }}
        >
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Paciente / Cliente</p>
            <p className="font-semibold" style={{ color: '#1F2933' }}>{recibo.paciente_nombre}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Fecha de emisión</p>
            <p className="font-semibold" style={{ color: '#1F2933' }}>
              {formatearFecha(recibo.fecha_emision)}
            </p>
          </div>
        </div>

        {/* Tabla de conceptos */}
        <div className="px-8 py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2" style={{ borderColor: '#0B2A44' }}>
                <th className="text-left pb-3 font-semibold" style={{ color: '#0B2A44' }}>Descripción</th>
                <th className="text-center pb-3 font-semibold w-20" style={{ color: '#0B2A44' }}>Cant.</th>
                <th className="text-right pb-3 font-semibold w-28" style={{ color: '#0B2A44' }}>Precio unit.</th>
                <th className="text-right pb-3 font-semibold w-28" style={{ color: '#0B2A44' }}>Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(item => (
                <tr key={item.id}>
                  <td className="py-3 text-gray-700">{item.descripcion}</td>
                  <td className="py-3 text-center text-gray-600">{item.cantidad}</td>
                  <td className="py-3 text-right text-gray-600">
                    ${Number(item.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 text-right font-medium" style={{ color: '#1F2933' }}>
                    ${Number(item.importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="mt-6 pt-4 border-t-2 flex flex-col items-end gap-2" style={{ borderColor: '#0B2A44' }}>
            <div className="flex gap-10 text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium w-28 text-right" style={{ color: '#1F2933' }}>
                ${Number(recibo.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex gap-10 items-center">
              <span className="text-lg font-bold" style={{ color: '#0B2A44' }}>Total</span>
              <span className="text-xl font-bold w-28 text-right" style={{ color: '#178C93' }}>
                ${Number(recibo.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Datos de pago */}
        <SeccionPago
          estado={recibo.estado}
          metodoPago={recibo.metodo_pago}
          fechaPago={recibo.fecha_pago}
          referenciaPago={recibo.referencia_pago}
          formatearFecha={formatearFecha}
        />

        {/* Observaciones */}
        {recibo.observaciones && (
          <div className="mx-8 mb-6 text-sm text-gray-500 italic">
            <span className="font-semibold not-italic text-gray-600">Nota: </span>
            {recibo.observaciones}
          </div>
        )}

        {/* Mensaje de agradecimiento */}
        <div className="mx-8 mb-6 text-center">
          <p className="text-sm font-medium" style={{ color: '#178C93' }}>
            ¡Gracias! Por confiar en nosotros para el cuidado de tu salud.
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 text-center border-t border-gray-100" style={{ backgroundColor: '#F4F8FA' }}>
          <p className="text-xs text-gray-400">
            En ABASTEMED, nuestro compromiso es brindar cuidado profesional, humano y de calidad en la comodidad de tu hogar.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Tel: 477 576 4099 &nbsp;·&nbsp;
            <a href="https://abastemed.vercel.app/login" className="underline hover:text-[#178C93]" target="_blank">
              abastemed.vercel.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
