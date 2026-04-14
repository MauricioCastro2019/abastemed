import { getFamiliar, vincularPaciente } from '@/lib/actions/familiares'
import { getPacientes } from '@/lib/actions/pacientes'
import { ArrowLeft, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Paciente } from '@/types'

export default async function EditarFamiliarPage({ params }: { params: { id: string } }) {
  let familiar
  try { familiar = await getFamiliar(params.id) }
  catch { notFound() }

  let pacientes: Paciente[] = []
  try { pacientes = await getPacientes() } catch { /* sin datos */ }

  const pacienteActual = familiar.paciente as unknown as { id: string; nombre: string; apellido: string } | null

  async function handleVincular(formData: FormData) {
    'use server'
    const pacienteId = (formData.get('paciente_id') as string) || null
    await vincularPaciente(params.id, pacienteId)
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
          <p className="text-sm text-gray-400">{familiar.email}</p>
        </div>
      </div>

      {/* Estado actual */}
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
              <p className="text-xs text-gray-400 mt-0.5">Cuenta con acceso al portal familiar</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-amber-600">Sin paciente vinculado — el familiar no ve nada hasta que se vincule</p>
        )}
      </div>

      {/* Formulario de vinculación */}
      <form action={handleVincular} className="bg-white rounded-xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
          {pacienteActual ? 'Cambiar paciente' : 'Vincular paciente'}
        </h2>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Seleccionar paciente</label>
          <select
            name="paciente_id"
            defaultValue={familiar.paciente_id ?? ''}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
          >
            <option value="">— Sin vincular —</option>
            {pacientes.map(p => (
              <option key={p.id} value={p.id}>
                {p.nombre} {p.apellido}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/familiares"
            className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:border-gray-300 bg-white text-gray-600 transition-all">
            Cancelar
          </Link>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ backgroundColor: '#2AABBF' }}
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
