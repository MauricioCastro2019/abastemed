'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { FinancialExpense } from '@/types'
import { crearSalida, actualizarSalida } from '@/lib/actions/finanzas'
import { TIPOS_SALIDA_OPTIONS, METODOS_PAGO_OPTIONS } from '@/lib/finanzas-labels'

interface Props {
  pacientes:  Array<{ id: string; nombre: string; apellido: string }>
  casos:      Array<{ id: string; titulo: string }>
  enfermeros: Array<{ id: string; nombre: string; apellido: string }>
  salida?:    FinancialExpense
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium" style={{ color: '#1B2B4B' }}>{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AABBF]/40 focus:border-[#2AABBF] bg-white'

const ESTATUS_SALIDA_OPTIONS = [
  { value: 'pendiente',     label: 'Pendiente' },
  { value: 'pagado',        label: 'Pagado' },
  { value: 'por_comprobar', label: 'Por comprobar' },
  { value: 'en_revision',   label: 'En revisión' },
]

export function SalidaForm({ pacientes, casos, enfermeros, salida }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const isEditing = !!salida

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEditing
        ? await actualizarSalida(salida.id, formData)
        : await crearSalida(formData)

      if (result?.error) {
        setError(result.error)
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        toast.error(result.error)
      }
    })
  }

  const d = salida

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Sección: Datos de la salida */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Datos de la salida</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Fecha de salida *" error={fieldErrors.fecha_salida}>
            <input
              name="fecha_salida"
              type="date"
              defaultValue={d?.fecha_salida ?? new Date().toISOString().split('T')[0]}
              required
              className={inputCls}
            />
          </Field>

          <Field label="Tipo de salida *" error={fieldErrors.tipo_salida}>
            <select name="tipo_salida" defaultValue={d?.tipo_salida ?? 'pago_enfermero'} required className={inputCls}>
              {TIPOS_SALIDA_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Beneficiario *" error={fieldErrors.beneficiario_nombre}>
            <input
              name="beneficiario_nombre"
              type="text"
              defaultValue={d?.beneficiario_nombre ?? ''}
              placeholder="Nombre de quien recibe el pago"
              required
              className={inputCls}
            />
          </Field>
          <Field label="Contacto del beneficiario" error={fieldErrors.beneficiario_contacto}>
            <input
              name="beneficiario_contacto"
              type="text"
              defaultValue={d?.beneficiario_contacto ?? ''}
              placeholder="Teléfono o cuenta bancaria"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Concepto *" error={fieldErrors.concepto}>
          <input
            name="concepto"
            type="text"
            defaultValue={d?.concepto ?? ''}
            placeholder="Ej. Guardia diurna 12h — lunes 23 Jun"
            required
            className={inputCls}
          />
        </Field>
      </div>

      {/* Sección: Relaciones */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Vinculación</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Enfermero/a" error={fieldErrors.enfermero_id}>
            <select name="enfermero_id" defaultValue={d?.enfermero_id ?? ''} className={inputCls}>
              <option value="">— Sin enfermero/a —</option>
              {enfermeros.map(e => (
                <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>
              ))}
            </select>
          </Field>

          <Field label="Paciente" error={fieldErrors.paciente_id}>
            <select name="paciente_id" defaultValue={d?.paciente_id ?? ''} className={inputCls}>
              <option value="">— Sin paciente —</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
              ))}
            </select>
          </Field>

          <Field label="Caso / Servicio" error={fieldErrors.caso_id}>
            <select name="caso_id" defaultValue={d?.caso_id ?? ''} className={inputCls}>
              <option value="">— Sin caso —</option>
              {casos.map(c => (
                <option key={c.id} value={c.id}>{c.titulo}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* Sección: Pago */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Pago</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Monto *" error={fieldErrors.monto}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                name="monto"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={d?.monto ?? ''}
                placeholder="0.00"
                required
                className={`${inputCls} pl-7`}
              />
            </div>
          </Field>

          <Field label="Estatus *" error={fieldErrors.estatus}>
            <select name="estatus" defaultValue={d?.estatus ?? 'pendiente'} required className={inputCls}>
              {ESTATUS_SALIDA_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Método de pago *" error={fieldErrors.metodo_pago}>
            <select name="metodo_pago" defaultValue={d?.metodo_pago ?? 'efectivo'} required className={inputCls}>
              {METODOS_PAGO_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Cuenta de origen" error={fieldErrors.cuenta_origen}>
            <input
              name="cuenta_origen"
              type="text"
              defaultValue={d?.cuenta_origen ?? ''}
              placeholder="Ej. Efectivo caja chica"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Referencia de pago" error={fieldErrors.referencia_pago}>
          <input
            name="referencia_pago"
            type="text"
            defaultValue={d?.referencia_pago ?? ''}
            placeholder="Folio de transferencia o número de operación"
            className={inputCls}
          />
        </Field>
      </div>

      {/* Observaciones */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <Field label="Observaciones" error={fieldErrors.observaciones}>
          <textarea
            name="observaciones"
            rows={3}
            defaultValue={d?.observaciones ?? ''}
            placeholder="Notas adicionales sobre esta salida"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 text-sm font-semibold rounded-lg text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: '#2AABBF' }}
        >
          {isPending ? 'Guardando...' : isEditing ? 'Actualizar salida' : 'Registrar salida'}
        </button>
      </div>
    </form>
  )
}
