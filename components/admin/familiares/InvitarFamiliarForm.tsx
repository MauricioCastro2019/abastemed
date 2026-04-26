'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { invitarFamiliar } from '@/lib/actions/familiares'
import { ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import type { Paciente } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"

export function InvitarFamiliarForm({ pacientes }: { pacientes: Paciente[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await invitarFamiliar(formData)
      if (result?.error) setError(result.error)
      else router.push('/familiares')
    })
  }

  return (
    <div className="space-y-6 max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/familiares" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Invitar familiar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Le llegará un correo con acceso al portal
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Nombre *</label>
              <input name="nombre" required className={INPUT} placeholder="María" />
            </div>
            <div>
              <label className={LABEL}>Apellido *</label>
              <input name="apellido" required className={INPUT} placeholder="González" />
            </div>
          </div>

          <div>
            <label className={LABEL}>Correo electrónico *</label>
            <input name="email" type="email" required className={INPUT} placeholder="familiar@correo.com" />
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Mail size={11} />
              Recibirá un enlace para establecer su contraseña
            </p>
          </div>

          <div>
            <label className={LABEL}>Vincular al paciente</label>
            <select name="paciente_id" className={INPUT}>
              <option value="">— Seleccionar paciente (opcional) —</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellido}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Puedes vincularlo después desde la lista de familiares
            </p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:border-gray-300 bg-white text-gray-600 transition-all">
            Cancelar
          </button>
          <button type="submit" disabled={isPending}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}>
            {isPending ? 'Enviando invitación...' : 'Enviar invitación'}
          </button>
        </div>
      </form>
    </div>
  )
}
