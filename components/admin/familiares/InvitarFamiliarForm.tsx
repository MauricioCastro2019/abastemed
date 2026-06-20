'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { invitarFamiliar } from '@/lib/actions/familiares'
import { ArrowLeft, Mail, Phone, User, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import type { Paciente } from '@/types'

const INPUT = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2AABBF] focus:ring-2 focus:ring-[#2AABBF]/10 transition-all bg-white"
const LABEL = "block text-xs font-medium text-gray-500 mb-1"

const PARENTESCO_OPS = [
  'Hijo/a', 'Esposo/a', 'Hermano/a', 'Nieto/a', 'Padre', 'Madre',
  'Sobrino/a', 'Yerno/Nuera', 'Cuidador/a principal', 'Otro',
]

export function InvitarFamiliarForm({ pacientes }: { pacientes: Paciente[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [whatsappIgual, setWhatsappIgual] = useState(false)

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
            Le llegará un correo con acceso al portal familiar
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Datos básicos */}
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#1B2B4B' }}>
            <User size={14} style={{ color: '#2AABBF' }} />
            Datos del familiar
          </h2>

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
            <label className={LABEL}>Parentesco</label>
            <select name="parentesco" className={INPUT} defaultValue="">
              <option value="">— Seleccionar —</option>
              {PARENTESCO_OPS.map(p => (
                <option key={p} value={p.toLowerCase()}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Teléfono */}
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#1B2B4B' }}>
            <Phone size={14} style={{ color: '#2AABBF' }} />
            Contacto
          </h2>

          <div>
            <label className={LABEL}>Teléfono principal</label>
            <input
              name="telefono"
              type="tel"
              className={INPUT}
              placeholder="Ej. 477 123 4567"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="whatsapp_igual_tel"
              name="whatsapp_igual_tel"
              value="true"
              checked={whatsappIgual}
              onChange={e => setWhatsappIgual(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="whatsapp_igual_tel" className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer">
              <MessageCircle size={11} className="text-green-500" />
              WhatsApp es el mismo número
            </label>
          </div>

          {!whatsappIgual && (
            <div>
              <label className={LABEL}>WhatsApp (si es diferente)</label>
              <input
                name="telefono_whatsapp"
                type="tel"
                className={INPUT}
                placeholder="Ej. 477 987 6543"
              />
            </div>
          )}
        </div>

        {/* Roles y permisos */}
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Roles</h2>
          {[
            { name: 'es_contacto_principal',   label: 'Contacto principal' },
            { name: 'es_contacto_emergencia',  label: 'Contacto de emergencia' },
            { name: 'es_responsable_pagos',    label: 'Responsable de pagos' },
          ].map(r => (
            <label key={r.name} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name={r.name} className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">{r.label}</span>
            </label>
          ))}
        </div>

        {/* Vinculación */}
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Paciente</h2>
          <div>
            <label className={LABEL}>Vincular al paciente</label>
            <select name="paciente_id" className={INPUT}>
              <option value="">— Sin vincular por ahora —</option>
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

        {/* Observaciones */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <label className={LABEL}>Observaciones internas (opcional)</label>
          <textarea
            name="observaciones_familiar"
            rows={3}
            className={`${INPUT} resize-none`}
            placeholder="Notas sobre este familiar (no visibles para él)"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-lg hover:border-gray-300 bg-white text-gray-600 transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all"
            style={{ backgroundColor: isPending ? '#94a3b8' : '#2AABBF' }}
          >
            {isPending ? 'Enviando invitación...' : 'Enviar invitación'}
          </button>
        </div>
      </form>
    </div>
  )
}
