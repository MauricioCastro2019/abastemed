import type { CSSProperties } from 'react'
import type { EstadoRecibo, MetodoPagoRecibo } from '@/types'
import {
  ABASTEMED_CONTACT_PHONE,
  ABASTEMED_PAYMENT_DATA,
  ESTADO_RECIBO_LABELS,
  METODO_PAGO_RECIBO_LABELS,
  getInstruccionesPago,
} from '@/lib/config/pagos'

interface Props {
  estado: EstadoRecibo
  metodoPago: MetodoPagoRecibo
  fechaPago?: string | null
  referenciaPago?: string | null
  formatearFecha: (iso: string) => string
}

const BOX_STYLE: CSSProperties = {
  margin: '0 40px 32px',
  padding: '20px',
  backgroundColor: '#F4F8FA',
  border: '1px solid #e2eef2',
  borderRadius: '12px',
}

const TITLE_STYLE: CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: '#0B2A44',
  margin: '0 0 12px 0',
}

const GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '16px',
  fontSize: '13px',
}

const MESSAGE_STYLE: CSSProperties = {
  margin: '16px 0 0 0',
  fontSize: '13px',
  color: '#374151',
  lineHeight: 1.5,
}

function Field({ label, value, mono, selectable }: { label: string; value: string; mono?: boolean; selectable?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ fontSize: '11px', color: '#8a9ba8', margin: '0 0 3px 0' }}>{label}</p>
      <p
        style={{
          fontWeight: 500,
          color: '#1F2933',
          margin: 0,
          fontFamily: mono ? 'monospace' : undefined,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          userSelect: selectable ? 'all' : undefined,
        }}
      >
        {value}
      </p>
    </div>
  )
}

// Sección dinámica de pago del recibo / nota de cobro: cambia según el
// estado del cobro y el método de pago seleccionado por el cliente.
export function SeccionPago({ estado, metodoPago, fechaPago, referenciaPago, formatearFecha }: Props) {
  if (estado === 'cancelado') {
    return (
      <div style={{ ...BOX_STYLE, backgroundColor: '#FDF1F1', border: '1px solid #f5d3d3', textAlign: 'center' }}>
        <p style={{ ...TITLE_STYLE, color: '#B91C1C', fontSize: '14px', letterSpacing: '2px', margin: 0 }}>
          CANCELADO
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#9B4B4B' }}>
          Este documento fue cancelado y no representa un cobro vigente.
        </p>
      </div>
    )
  }

  if (estado === 'pagado') {
    return (
      <div style={BOX_STYLE}>
        <p style={TITLE_STYLE}>Información de pago</p>
        <div style={GRID_STYLE}>
          <Field label="Estado" value={ESTADO_RECIBO_LABELS.pagado} />
          <Field label="Método de pago" value={METODO_PAGO_RECIBO_LABELS[metodoPago]} />
          {fechaPago && <Field label="Fecha de pago" value={formatearFecha(fechaPago)} />}
          {referenciaPago && <Field label="Referencia / folio de pago" value={referenciaPago} mono />}
        </div>
      </div>
    )
  }

  // estado === 'pendiente'
  const instrucciones = getInstruccionesPago(metodoPago)

  return (
    <div style={BOX_STYLE}>
      <p style={TITLE_STYLE}>{instrucciones.titulo}</p>
      <div style={GRID_STYLE}>
        <Field label="Estado" value={ESTADO_RECIBO_LABELS.pendiente} />
        <Field label="Método de pago" value={METODO_PAGO_RECIBO_LABELS[metodoPago]} />
      </div>

      {instrucciones.mostrarDatosBancarios && (
        <div style={{ ...GRID_STYLE, marginTop: '16px' }}>
          <Field label="Beneficiario" value={ABASTEMED_PAYMENT_DATA.beneficiary} />
          <Field label="Institución" value={ABASTEMED_PAYMENT_DATA.institution} />
          <Field label="CLABE" value={ABASTEMED_PAYMENT_DATA.clabe} mono selectable />
        </div>
      )}

      <p style={MESSAGE_STYLE}>{instrucciones.mensaje}</p>

      {metodoPago === 'efectivo' && (
        <p style={MESSAGE_STYLE}>Tel: {ABASTEMED_CONTACT_PHONE}</p>
      )}
    </div>
  )
}
