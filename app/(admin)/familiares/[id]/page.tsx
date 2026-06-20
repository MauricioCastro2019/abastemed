import { getFamiliar, actualizarFamiliar, vincularPaciente } from '@/lib/actions/familiares'
import { getPacientes } from '@/lib/actions/pacientes'
import { ArrowLeft, UserCheck, Phone, MessageCircle, Settings, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Paciente } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"

const PARENTESCO_OPS = [
  'hijo/a', 'esposo/a', 'hermano/a', 'nieto/a', 'padre', 'madre',
  'sobrino/a', 'yerno/nuera', 'cuidador/a principal', 'otro',
]

export default async function EditarFamiliarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let familiar
  try { familiar = await getFamiliar(id) }
  catch { notFound() }

  let pacientes: Paciente[] = []
  try { pacientes = await getPacientes() } catch { /* sin datos */ }

  const pacienteActual = familiar.paciente as unknown as { id: string; nombre: string; apellido: string } | null

  async function handleActualizar(formData: FormData) {
    'use server'
    const result = await actualizarFamiliar(id, formData)
    if (result.error) return
    redirect('/familiares')
  }

  async function handleVincular(formData: FormData) {
    'use server'
    const pacienteId = (formData.get('paciente_id') as string) || null
    const parentesco = (formData.get('parentesco') as string) || undefined
    await vincularPaciente(id, pacienteId, parentesco)
  }

  const invitacionLabel: Record<string, string> = {
    pendiente: 'Invitación pendiente',
    enviada:   'Invitación enviada',
    aceptada:  'Acceso activo',
    expirada:  'Invitación expirada',
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/familiares" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
            {familiar.nombre} {familiar.apellido}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-gray-400">{familiar.email}</p>
            {familiar.estado_invitacion && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: familiar.estado_invitacion === 'aceptada' ? '#ECFDF5' : '#FFFBEB',
                  color: familiar.estado_invitacion === 'aceptada' ? '#065F46' : '#92400E',
                }}>
                {invitacionLabel[familiar.estado_invitacion] ?? familiar.estado_invitacion}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Estado y último acceso */}
      {familiar.ultimo_acceso_familiar && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
          Último acceso al portal:{' '}
          {new Date(familiar.ultimo_acceso_familiar).toLocaleString('es-MX', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </div>
      )}

      {/* Advertencia si inactivo */}
      {familiar.activo_familiar === false && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
          <AlertTriangle size={13} />
          Este familiar tiene acceso suspendido. No puede ingresar al portal.
        </div>
      )}

      {/* Paciente vinculado */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#1B2B4B' }}>Paciente vinculado</h2>
        {pacienteActual ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ backgroundColor: '#1B2B4B' }}>
              {pacienteActual.nombre[0]}{pacienteActual.apellido[0]}
            </div>
            <div>
              <p className="font-medium text-sm flex items-center gap-1.5" style={{ color: '#1B2B4B' }}>
                <UserCheck size={14} style={{ color: '#059669' }} />
                {pacienteActual.nombre} {pacienteActual.apellido}
              </p>
              {familiar.parentesco && (
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {familiar.parentesco}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-600">Sin paciente vinculado — el familiar no ve información hasta que se vincule</p>
        )}
      </div>

      {/* Formulario: vincular paciente */}
      <form action={handleVincular} className="bg-white rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
          {pacienteActual ? 'Cambiar vinculación' : 'Vincular paciente'}
        </h2>

        <div>
          <label className={LABEL}>Paciente</label>
          <select name="paciente_id" defaultValue={familiar.paciente_id ?? ''} className={INPUT}>
            <option value="">— Sin vincular —</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL}>Parentesco</label>
          <select name="parentesco" defaultValue={familiar.parentesco ?? ''} className={INPUT}>
            <option value="">— Seleccionar —</option>
            {PARENTESCO_OPS.map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end">
          <button type="submit"
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ backgroundColor: '#2AABBF' }}>
            Guardar vinculación
          </button>
        </div>
      </form>

      {/* Formulario: datos del familiar */}
      <form action={handleActualizar} className="bg-white rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#1B2B4B' }}>
          <Settings size={14} style={{ color: '#2AABBF' }} />
          Datos del familiar
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Nombre</label>
            <input name="nombre" defaultValue={familiar.nombre ?? ''} required className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Apellido</label>
            <input name="apellido" defaultValue={familiar.apellido ?? ''} required className={INPUT} />
          </div>
        </div>

        <div>
          <label className={LABEL}>Teléfono principal</label>
          <div className="relative">
            <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="telefono"
              type="tel"
              defaultValue={familiar.telefono ?? ''}
              className={`${INPUT} pl-8`}
              placeholder="477 123 4567"
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>WhatsApp</label>
          <div className="relative">
            <MessageCircle size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400" />
            <input
              name="telefono_whatsapp"
              type="tel"
              defaultValue={familiar.telefono_whatsapp ?? ''}
              className={`${INPUT} pl-8`}
              placeholder="(si es diferente al principal)"
            />
          </div>
          <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
            <input
              type="checkbox"
              name="whatsapp_igual_tel"
              defaultChecked={familiar.whatsapp_igual_tel ?? false}
              className="rounded border-gray-300"
            />
            <span className="text-xs text-gray-500">WhatsApp es el mismo número que el teléfono principal</span>
          </label>
        </div>

        {/* Flags */}
        <div className="space-y-2">
          <p className={LABEL}>Roles</p>
          {[
            { name: 'es_contacto_principal',   label: 'Contacto principal',  defaultChecked: familiar.es_contacto_principal ?? false },
            { name: 'es_contacto_emergencia',  label: 'Contacto de emergencia', defaultChecked: familiar.es_contacto_emergencia ?? false },
            { name: 'es_responsable_pagos',    label: 'Responsable de pagos', defaultChecked: familiar.es_responsable_pagos ?? false },
          ].map(r => (
            <label key={r.name} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name={r.name} defaultChecked={r.defaultChecked} className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">{r.label}</span>
            </label>
          ))}
        </div>

        {/* Activo */}
        <div>
          <label className={LABEL}>Estado de acceso</label>
          <select
            name="activo_familiar"
            defaultValue={familiar.activo_familiar !== false ? 'true' : 'false'}
            className={INPUT}
          >
            <option value="true">Activo — puede ingresar al portal</option>
            <option value="false">Suspendido — sin acceso</option>
          </select>
        </div>

        <div>
          <label className={LABEL}>Observaciones internas</label>
          <textarea
            name="observaciones_familiar"
            rows={3}
            defaultValue={familiar.observaciones_familiar ?? ''}
            className={`${INPUT} resize-none`}
            placeholder="Notas internas sobre este familiar"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Link href="/familiares"
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:border-gray-300 bg-white text-gray-600 transition-all">
            Cancelar
          </Link>
          <button type="submit"
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ backgroundColor: '#2AABBF' }}>
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}
