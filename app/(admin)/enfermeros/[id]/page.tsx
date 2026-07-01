import { getEnfermero } from '@/lib/actions/enfermeros'
import { getEquipoCuidadoByEnfermero } from '@/lib/actions/equipo-cuidado'
import { getCompetenciasDeEnfermero } from '@/lib/actions/centro-profesional'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Pencil, Phone, Mail, Star, Briefcase, FileText, Download, Users, Heart, Link2, Shield } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { VincularCuentaWidget } from './VincularCuentaWidget'
import { CompetenciasEnfermeroWidget } from './CompetenciasEnfermeroWidget'

const ROL_LABEL: Record<string, string> = {
  titular: 'Titular', habitual: 'Habitual', suplente: 'Suplente',
  coordinador: 'Coordinador', apoyo: 'Apoyo',
}
const ROL_COLOR: Record<string, { color: string; bg: string }> = {
  titular:     { color: '#6366F1', bg: '#EEF2FF' },
  habitual:    { color: '#2AABBF', bg: '#ECFEFF' },
  suplente:    { color: '#d97706', bg: '#FEF3C7' },
  coordinador: { color: '#7c3aed', bg: '#F3E8FF' },
  apoyo:       { color: '#6b7280', bg: '#F3F4F6' },
}
const ESTADO_COLOR: Record<string, { color: string; bg: string }> = {
  activa:     { color: '#059669', bg: '#ECFDF5' },
  pendiente:  { color: '#d97706', bg: '#FEF3C7' },
  pausada:    { color: '#6b7280', bg: '#F3F4F6' },
}

export default async function EnfermeroDetailPage({ params }: { params: { id: string } }) {
  let enfermero
  try {
    enfermero = await getEnfermero(params.id)
  } catch {
    notFound()
  }

  const [equipo, competenciasData, supabase] = await Promise.all([
    getEquipoCuidadoByEnfermero(params.id).catch(() => ({ activos: [], pendientes: [], historial: [] })),
    getCompetenciasDeEnfermero(params.id).catch(() => ({ competencias: [], mis_competencias: [] })),
    createClient(),
  ])
  const pacientesActivos = [...equipo.activos, ...equipo.pendientes]

  // Buscar si ya hay una cuenta de usuario vinculada a este enfermero
  const { data: perfilVinculado } = await supabase
    .from('perfiles')
    .select('id, nombre, apellido, email')
    .eq('enfermero_id', params.id)
    .maybeSingle()

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/enfermeros" className="text-gray-400 hover:text-[#1B2B4B] transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
              style={{ backgroundColor: '#1B2B4B' }}>
              {enfermero.nombre[0]}{enfermero.apellido[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
                {enfermero.nombre} {enfermero.apellido}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-500">{enfermero.cedula}</span>
                <span className="text-gray-300">·</span>
                <Badge variant="outline" className="text-xs"
                  style={{
                    borderColor: enfermero.disponible ? '#2AABBF' : '#e5e7eb',
                    color: enfermero.disponible ? '#2AABBF' : '#6b7280',
                    backgroundColor: enfermero.disponible ? '#EBF8FB' : 'transparent',
                  }}>
                  {enfermero.disponible ? 'Disponible' : 'No disponible'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <Link href={`/enfermeros/${enfermero.id}/editar`}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all bg-white">
          <Pencil size={14} />
          Editar
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Star size={16} className="text-amber-400 fill-amber-400" />
            <span className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
              {enfermero.rating?.toFixed(1) ?? '0.0'}
            </span>
          </div>
          <p className="text-xs text-gray-400">Rating</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Briefcase size={16} style={{ color: '#2AABBF' }} />
            <span className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
              {enfermero.total_casos}
            </span>
          </div>
          <p className="text-xs text-gray-400">Casos totales</p>
        </div>
      </div>

      {/* Contacto */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#1B2B4B' }}>Contacto</h2>
        <div className="space-y-3">
          <a href={`tel:${enfermero.telefono}`}
            className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#2AABBF] transition-colors">
            <Phone size={15} />
            {enfermero.telefono}
          </a>
          <a href={`mailto:${enfermero.email}`}
            className="flex items-center gap-3 text-sm text-gray-600 hover:text-[#2AABBF] transition-colors">
            <Mail size={15} />
            {enfermero.email}
          </a>
        </div>
      </div>

      {/* Especialidades */}
      {enfermero.especialidades?.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1B2B4B' }}>Especialidades</h2>
          <div className="flex flex-wrap gap-2">
            {enfermero.especialidades.map((esp, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: '#EBF8FB', color: '#2AABBF' }}>
                {esp}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CV */}
      {enfermero.cv_url && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold mb-3" style={{ color: '#1B2B4B' }}>Currículum vitae</h2>
          <a href={enfermero.cv_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[#2AABBF] text-[#2AABBF] hover:bg-[#EBF8FB] transition-all">
            <Download size={15} />
            Ver / Descargar CV
          </a>
        </div>
      )}

      {/* Bio */}
      {enfermero.bio && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={15} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>Notas</h2>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{enfermero.bio}</p>
        </div>
      )}

      {/* Cuenta de acceso */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Link2 size={15} style={{ color: '#2AABBF' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            Cuenta de acceso al portal
          </h2>
        </div>
        <VincularCuentaWidget
          enfermeroId={params.id}
          yaVinculado={!!perfilVinculado}
          emailVinculado={perfilVinculado?.email}
        />
      </div>

      {/* Competencias y validaciones */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={15} style={{ color: '#2AABBF' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
            Competencias y validaciones
          </h2>
        </div>
        <CompetenciasEnfermeroWidget
          enfermeroId={params.id}
          competencias={competenciasData.competencias}
          mis_competencias={competenciasData.mis_competencias}
        />
      </div>

      {/* Pacientes asignados */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={15} style={{ color: '#2AABBF' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>
              Pacientes asignados
            </h2>
          </div>
          <span className="text-xs text-gray-400">
            {pacientesActivos.length} activo{pacientesActivos.length !== 1 ? 's' : ''}
          </span>
        </div>

        {pacientesActivos.length === 0 ? (
          <div className="text-center py-6">
            <Heart size={20} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sin pacientes asignados actualmente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pacientesActivos.map(a => {
              const p = a.paciente
              if (!p) return null
              const rolCfg = ROL_COLOR[a.rol] ?? ROL_COLOR.apoyo
              const estadoCfg = ESTADO_COLOR[a.estado] ?? ESTADO_COLOR.activa
              return (
                <Link
                  key={a.id}
                  href={`/pacientes/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#2AABBF] transition-all group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: '#1B2B4B' }}>
                    {p.nombre[0]}{p.apellido[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-[#1B2B4B]">
                      {p.nombre} {p.apellido}
                    </p>
                    {p.diagnostico && (
                      <p className="text-xs text-gray-400 truncate">{p.diagnostico}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: rolCfg.bg, color: rolCfg.color }}>
                      {ROL_LABEL[a.rol] ?? a.rol}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: estadoCfg.bg, color: estadoCfg.color }}>
                      {a.estado === 'activa' ? 'Activa' : a.estado === 'pendiente' ? 'Pendiente' : a.estado}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
