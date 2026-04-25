import { getRecibo } from '@/lib/actions/recibos'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PrintButton } from '@/components/print/PrintButton'

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

export default async function ImprimirReciboPage({ params }: Props) {
  // Verificar autenticación (esta ruta no hereda el AdminLayout)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let recibo
  try {
    recibo = await getRecibo(params.id)
  } catch {
    notFound()
  }

  const items = recibo.recibo_items ?? []

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .receipt-header { background-color: #0B2A44 !important; }
          .receipt-accent { background-color: #F4F8FA !important; }
        }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      `}</style>

      {/* Barra de acciones — se oculta al imprimir */}
      <div className="no-print bg-gray-100 border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <a
          href={`/recibos/${recibo.id}`}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Volver al recibo
        </a>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-500 font-mono">{recibo.folio}</span>
        <div className="flex-1" />
        <PrintButton />
      </div>

      {/* Página del recibo */}
      <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-0 print:px-0">
        <div
          className="max-w-2xl mx-auto bg-white shadow-lg print:shadow-none"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
        >
          {/* Encabezado con branding */}
          <div className="receipt-header px-10 py-8" style={{ backgroundColor: '#0B2A44' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#178C93' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                      <path d="M14 10h4v4h4v4h-4v4h-4v-4h-4v-4h4v-4z" fill="white" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ color: '#ffffff', fontWeight: 800, fontSize: '20px', letterSpacing: '4px', margin: 0 }}>
                      ABASTEMED
                    </p>
                    <p style={{ color: '#178C93', fontSize: '12px', margin: 0 }}>Cuidado profesional en casa</p>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px 0' }}>
                  Recibo de pago
                </p>
                <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '18px', fontFamily: 'monospace', margin: 0 }}>
                  {recibo.folio}
                </p>
              </div>
            </div>
          </div>

          {/* Paciente y fecha */}
          <div className="receipt-accent px-10 py-5 border-b border-gray-100" style={{ backgroundColor: '#F4F8FA' }}>
            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#8a9ba8', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px 0' }}>
                  Paciente / Cliente
                </p>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#1F2933', margin: 0 }}>
                  {recibo.paciente_nombre}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#8a9ba8', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 4px 0' }}>
                  Fecha de emisión
                </p>
                <p style={{ fontSize: '16px', fontWeight: 600, color: '#1F2933', margin: 0 }}>
                  {formatearFecha(recibo.fecha_emision)}
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de conceptos */}
          <div style={{ padding: '32px 40px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #0B2A44' }}>
                  <th style={{ textAlign: 'left', padding: '0 0 12px 0', color: '#0B2A44', fontWeight: 600 }}>Descripción</th>
                  <th style={{ textAlign: 'center', padding: '0 0 12px 12px', color: '#0B2A44', fontWeight: 600, width: '70px' }}>Cant.</th>
                  <th style={{ textAlign: 'right', padding: '0 0 12px 12px', color: '#0B2A44', fontWeight: 600, width: '110px' }}>Precio unit.</th>
                  <th style={{ textAlign: 'right', padding: '0 0 12px 12px', color: '#0B2A44', fontWeight: 600, width: '110px' }}>Importe</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: i < items.length - 1 ? '1px solid #f0f4f6' : 'none' }}>
                    <td style={{ padding: '11px 0', color: '#374151' }}>{item.descripcion}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'center', color: '#6B7280' }}>{item.cantidad}</td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', color: '#6B7280' }}>
                      ${Number(item.precio_unitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 500, color: '#1F2933' }}>
                      ${Number(item.importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '2px solid #0B2A44', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '40px', fontSize: '14px' }}>
                <span style={{ color: '#6B7280' }}>Subtotal</span>
                <span style={{ fontWeight: 500, color: '#1F2933', width: '110px', textAlign: 'right' }}>
                  ${Number(recibo.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, color: '#0B2A44' }}>Total</span>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#178C93', width: '110px', textAlign: 'right' }}>
                  ${Number(recibo.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Datos de pago */}
          <div style={{ margin: '0 40px 32px', padding: '20px', backgroundColor: '#F4F8FA', border: '1px solid #e2eef2', borderRadius: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#0B2A44', margin: '0 0 12px 0' }}>
              Datos para el pago
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '13px' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#8a9ba8', margin: '0 0 3px 0' }}>Titular</p>
                <p style={{ fontWeight: 500, color: '#1F2933', margin: 0 }}>Alan Eduardo Martínez Navarro</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#8a9ba8', margin: '0 0 3px 0' }}>Número de tarjeta</p>
                <p style={{ fontWeight: 500, color: '#1F2933', fontFamily: 'monospace', margin: 0 }}>5428 7805 8594 5967</p>
              </div>
              <div>
                <p style={{ fontSize: '11px', color: '#8a9ba8', margin: '0 0 3px 0' }}>Plataforma</p>
                <p style={{ fontWeight: 600, color: '#178C93', margin: 0 }}>Mercado Pago</p>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {recibo.observaciones && (
            <div style={{ margin: '0 40px 24px', fontSize: '13px', color: '#6B7280', fontStyle: 'italic' }}>
              <strong style={{ fontStyle: 'normal', color: '#374151' }}>Nota: </strong>
              {recibo.observaciones}
            </div>
          )}

          {/* Mensaje de agradecimiento */}
          <div style={{ padding: '0 40px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#178C93', margin: 0 }}>
              ¡Gracias! Por confiar en nosotros para el cuidado de tu salud.
            </p>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 40px', backgroundColor: '#F4F8FA', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
            <p style={{ fontSize: '11px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
              En ABASTEMED, nuestro compromiso es brindar cuidado profesional, humano y de calidad en la comodidad de tu hogar.
            </p>
            <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0 }}>
              Tel: 477 576 4099 &nbsp;·&nbsp; abastemed.vercel.app
            </p>
          </div>
        </div>
      </div>

      {/* Script para auto-imprimir si ?print=1 en URL */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (new URLSearchParams(window.location.search).get('print') === '1') {
              window.addEventListener('load', () => setTimeout(() => window.print(), 500));
            }
          `,
        }}
      />
    </>
  )
}
