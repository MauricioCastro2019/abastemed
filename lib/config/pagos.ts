import type { EstadoRecibo, MetodoPagoRecibo } from '@/types'

// Configuración centralizada de datos de pago de ABASTEMED.
// Cualquier dato bancario o de contacto que se muestre en recibos/notas
// de cobro debe leerse de aquí, nunca repetirse en componentes.
export const ABASTEMED_PAYMENT_DATA = {
  beneficiary: 'Mauricio Banquells Castro',
  institution: 'Mercado Pago W',
  clabe: '722969010269262658',
}

export const ABASTEMED_CONTACT_PHONE = '479 138 53 08'

export const METODO_PAGO_RECIBO_LABELS: Record<MetodoPagoRecibo, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia o depósito',
  otro: 'Otro',
  por_coordinar: 'Por coordinar',
}

export const ESTADO_RECIBO_LABELS: Record<EstadoRecibo, string> = {
  pendiente: 'Pendiente de pago',
  pagado: 'Pagado',
  cancelado: 'Cancelado',
}

// El encabezado del documento depende del estado del cobro:
// pendiente -> "Nota de cobro", pagado -> "Recibo de pago".
export function getTituloDocumento(estado: EstadoRecibo): string {
  return estado === 'pagado' ? 'Recibo de pago' : 'Nota de cobro'
}

export interface InstruccionesPago {
  titulo: string
  mensaje: string
  mostrarDatosBancarios: boolean
}

// Determina el contenido de la sección de pago del recibo/nota de cobro
// según el método de pago elegido por el cliente.
export function getInstruccionesPago(metodoPago: MetodoPagoRecibo): InstruccionesPago {
  switch (metodoPago) {
    case 'efectivo':
      return {
        titulo: 'Pago en efectivo',
        mensaje: 'Para realizar el pago en efectivo, comunícate con nosotros para coordinar la entrega y confirmación del pago.',
        mostrarDatosBancarios: false,
      }
    case 'transferencia':
      return {
        titulo: 'Datos para transferencia o depósito',
        mensaje: 'Por favor, envía tu comprobante de pago para que podamos registrarlo y confirmar la liquidación del servicio.',
        mostrarDatosBancarios: true,
      }
    case 'otro':
    case 'por_coordinar':
    default:
      return {
        titulo: 'Método de pago por coordinar',
        mensaje: 'Comunícate con ABASTEMED para confirmar la forma de pago correspondiente.',
        mostrarDatosBancarios: false,
      }
  }
}
