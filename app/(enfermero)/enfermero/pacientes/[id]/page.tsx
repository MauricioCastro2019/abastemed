import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Heart, Calendar, AlertTriangle,
  Pill, Shield, Phone, Clock
} from 'lucide-react'
import type { Paciente, RolEquipo } from '@/types'

const ROL_CONFIG: Record<RolEquipo, { label: string; color: string; bg: string }> = {
  titular:     { label: 'Titular',     color: '#6366F1', bg: '#EEF2FF' },
  habitual:    { label: 'Habitual',    color: '#2AABBF', bg: '#ECFEFF' },
  suplente:    { label: 'Suplente',    color: '#d97706', bg: '#FEF3C7' },
  coordinador: { label: 'Coordinador', color: '#7c3aed', bg: '#F3E8FF' },
  apoyo:       { label: 'Apoyo',       color: '#6b7280', bg: '#F3F4F6' },
}

function formatFecha(f: string) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTurno(f: string) {
  return new Date(f).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function EnfermeroPacientePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener perfil del enfermero logueado
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('enfermero_id, email')
    .eq('id', user.id)
    .single()

  // Resolver enfermero_id (por FK o por email)
  let enfermeroId = perfil?.enfermero_id as string | null
  if (!enfermeroId && perfil?.email) {
    const { data: enf } = await supabase
      .from('enfermeros')
      .select('id')
      .eq('email', perfil.email)
      .maybeSingle()
    enfermeroId = enf?.id ?? null
  }

  if (!enfermeroId) redirect('/enfermero/dashboard')

  // Verificar que el enfermero tiene acceso a este paciente
  const { data: asignacion } = await supabase
    .from('equipo_cuidado')
    .select('id, rol, estado, es_principal, horario, fecha_inicio, fecha_fin, acceso_expediente, observaciones')
    .eq('paciente_id', params.id)
    .eq('enfermero_id', enfermeroId)
    .in('estado', ['activa', 'pendiente', 'pausada'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!asignacion) notFound()

  // Cargar datos del paciente
  const { data: paciente } = await supabase
    .from('pacientes')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!paciente) notFound()

  const p = paciente as Paciente

  // Cargar próximos turnos del enfermero en este paciente
  const { data: turnos } = await supabase
    .from('turnos')
    .select('id, fecha_inicio, fecha_fin, status, caso:casos(titulo, paciente_id)')
    .eq('enfermero_id', enfermeroId)
    .gte('fecha_fin', new Date().toISOString())
    .order('fecha_inicio', { ascending: true })
    .limit(5)

  // Filtrar turnos de este paciente
  const turnosPaciente = (turnos ?? []).filter(t => {
    const c = t.caso as { paciente_id?: string } | null
    return c?.paciente_id === params.id
  })

  const rolCfg = ROL_CONFIG[asignacion.rol as RolEquipo] ?? ROL_CONFIG.apoyo
  const edad = p.fecha_nacimiento
    ? Math.floor((Date.now() - new Date(p.fecha_nacimiento).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-8">

      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <Link href="/enfermero/mis-pacientes"
          className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1B2B4B' }}>
            {p.nombre} {p.apellido}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {edad !== null ? `${edad} años` : ''}{edad && p.contexto ? ' · ' : ''}
            {p.contexto === 'domicilio' ? 'Cuidado a domicilio'
              : p.contexto === 'hospital' ? 'Hospital'
              : p.contexto === 'casa_reposo' ? 'Casa de reposo' : ''}
          </p>
        </div>
      </div>

      {/* Mi rol en este paciente */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={14} style={{ color: '#2AABBF' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Mi asignación</h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: rolCfg.bg, color: rolCfg.color }}>
            {rolCfg.label}
          </span>
          {asignacion.es_principal && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: '#FEF3C7', color: '#d97706' }}>
              Enfermero principal
            </span>
          )}
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar size={11} /> Desde {formatFecha(asignacion.fecha_inicio)}
          </span>
        </div>
        {asignacion.observaciones && (
          <p className="mt-3 text-xs text-gray-500 italic border-l-2 pl-3" style={{ borderColor: '#2AABBF' }}>
            {asignacion.observaciones}
          </p>
        )}
      </div>

      {/* Diagnóstico */}
      {p.diagnostico && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={14} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Diagnóstico</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{p.diagnostico}</p>
        </div>
      )}

      {/* Alergias — siempre visible por seguridad */}
      {p.alergias?.length > 0 && (
        <div className="rounded-xl p-4 border-2" style={{ backgroundColor: '#FEF2F2', borderColor: '#fca5a5' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} style={{ color: '#dc2626' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#dc2626' }}>Alergias conocidas</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {p.alergias.map((a, i) => (
              <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-full bg-white"
                style={{ color: '#dc2626', border: '1px solid #fca5a5' }}>
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Medicamentos — solo si tiene acceso_expediente */}
      {asignacion.acceso_expediente && p.medicamentos?.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Pill size={14} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Medicamentos</h2>
          </div>
          <div className="space-y-1.5">
            {p.medicamentos.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#2AABBF' }} />
                {m}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacto familiar */}
      {p.contacto_familiar?.nombre && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Phone size={14} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Contacto familiar</h2>
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <p className="font-medium">{p.contacto_familiar.nombre}
              <span className="text-gray-400 font-normal"> · {p.contacto_familiar.relacion}</span>
            </p>
            {p.contacto_familiar.telefono && (
              <a href={`tel:${p.contacto_familiar.telefono}`}
                className="flex items-center gap-1.5 text-sm hover:text-[#2AABBF] transition-colors">
                <Phone size={12} />
                {p.contacto_familiar.telefono}
              </a>
            )}
          </div>
        </div>
      )}

      {/* Próximas guardias */}
      {turnosPaciente.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Mis próximas guardias</h2>
          </div>
          <div className="space-y-2">
            {turnosPaciente.map(t => (
              <Link key={t.id}
                href={`/enfermero/turnos/${t.id}/preparacion`}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#2AABBF] transition-all group">
                <div>
                  <p className="text-xs font-medium text-gray-700 group-hover:text-[#1B2B4B]">
                    {formatTurno(t.fecha_inicio)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    hasta {new Date(t.fecha_fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  t.status === 'activo' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                }`}>
                  {t.status === 'activo' ? 'En curso' : 'Programada'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
