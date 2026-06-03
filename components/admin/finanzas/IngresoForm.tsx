'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { FinancialIncome } from '@/types'
import { crearIngreso, actualizarIngreso } from '@/lib/actions/finanzas'
import { TIPOS_INGRESO_OPTIONS, METODOS_PAGO_OPTIONS } from '@/lib/finanzas-labels'

interface Props {
  pacientes: Array<{ id: string; nombre: string; apellido: string }>
  casos:     Array<{ id: string; titulo: string }>
  ingreso?:  FinancialIncome
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

export function IngresoForm({ pacientes, casos, ingreso }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const isEditing = !!ingreso

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = isEditing
        ? await actualizarIngreso(ingreso.id, formData)
        : await crearIngreso(formData)

      if (result?.error) {
        setError(result.error)
        if (result.fieldErrors) setFieldErrors(result.fieldErrors)
        toast.error(result.error)
      }
    })
  }

  const d = ingreso

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Sección: Datos del pago */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Datos del pago</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Fecha de pago *" error={fieldErrors.fecha_pago}>
            <input
              name="fecha_pago"
              type="date"
              defaultValue={d?.fecha_pago ?? new Date().toISOString().split('T')[0]}
              required
              className={inputCls}
            />
          </Field>

          <Field label="Tipo de ingreso *" error={fieldErrors.tipo_ingreso}>
            <select name="tipo_ingreso" defaultValue={d?.tipo_ingreso ?? 'pago_servicio'} required className={inputCls}>
              {TIPOS_INGRESO_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Responsable de pago *" error={fieldErrors.responsable_pago_nombre}>
            <input
              name="responsable_pago_nombre"
              type="text"
              defaultValue={d?.responsable_pago_nombre ?? ''}
              placeholder="Nombre completo del pagador"
              required
              className={inputCls}
            />
          </Field>
          <Field label="Contacto del responsable" error={fieldErrors.responsable_pago_contacto}>
            <input
              name="responsable_pago_contacto"
              type="text"
              defaultValue={d?.responsable_pago_contacto ?? ''}
              placeholder="Teléfono o email"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Concepto *" error={fieldErrors.concepto}>
          <input
            name="concepto"
            type="text"
            defaultValue={d?.concepto ?? ''}
            placeholder="Ej. Pago semanal enfermería 24-30 Jun 2026"
            required
            className={inputCls}
          />
        </Field>
      </div>

      {/* Sección: Paciente / Caso */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Paciente y servicio</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Periodo: inicio" error={fieldErrors.periodo_cubierto_inicio}>
            <input
              name="periodo_cubierto_inicio"
              type="date"
              defaultValue={d?.periodo_cubierto_inicio ?? ''}
              className={inputCls}
            />
          </Field>
          <Field label="Periodo: fin" error={fieldErrors.periodo_cubierto_fin}>
            <input
              name="periodo_cubierto_fin"
              type="date"
              defaultValue={d?.periodo_cubierto_fin ?? ''}
              className={inputCls}
            />
          </Field>
          <Field label="Fecha límite de pago" error={fieldErrors.fecha_limite_pago}>
            <input
              name="fecha_limite_pago"
              type="date"
              defaultValue={d?.fecha_limite_pago ?? ''}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Sección: Montos */}
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-400">Montos</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Monto total esperado *" error={fieldErrors.monto_total}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                name="monto_total"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={d?.monto_total ?? ''}
                placeholder="0.00"
                required
                className={`${inputCls} pl-7`}
              />
            </div>
          </Field>

          <Field label="Monto recibido *" error={fieldErrors.monto_recibido}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                name="monto_recibido"
                type="number"
                step="0.01"
                min="0"
                defaultValue={d?.monto_recibido ?? ''}
                placeholder="0.00"
                required
                className={`${inputCls} pl-7`}
              />
            </div>
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
          <Field label="Cuenta receptora" error={fieldErrors.cuenta_receptora}>
            <input
              name="cuenta_receptora"
              type="text"
              defaultValue={d?.cuenta_receptora ?? ''}
              placeholder="Ej. BBVA cuenta 1234"
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Referencia / Folio de transferencia" error={fieldErrors.referencia_pago}>
          <input
            name="referencia_pago"
            type="text"
            defaultValue={d?.referencia_pago ?? ''}
            placeholder="Número de referencia o comprobante"
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
            placeholder="Notas adicionales sobre este ingreso"
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
          {isPending ? 'Guardando...' : isEditing ? 'Actualizar ingreso' : 'Registrar ingreso'}
        </button>
      </div>
    </form>
  )
}
