'use client'

import { useState, useTransition } from 'react'
import { cambiarEstadoLevantamiento } from '@/lib/actions/levantamientos'
import type { LevantamientoPaciente } from '@/types'
import {
  AlertTriangle, Phone, Mail, MapPin, Calendar, User, Activity,
  Pill, Package, Home, ClipboardList, DollarSign, CheckCircle, Pencil,
} from 'lucide-react'
import Link from 'next/link'

// ── Tipos de badges ───────────────────────────────────────────
const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  borrador:           { label: 'Borrador',           bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
  pendiente_revision: { label: 'Pendiente revisión', bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' },
  revisado:           { label: 'Revisado',           bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' },
  aprobado:           { label: 'Aprobado',           bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
  convertido:         { label: 'Convertido',         bg: '#EBF8FB', text: '#1B2B4B', border: '#2AABBF' },
  cancelado:          { label: 'Cancelado',          bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
}

const RIESGO_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  bajo:  { label: '● Riesgo Bajo',  bg: '#DCFCE7', text: '#166534' },
  medio: { label: '● Riesgo Medio', bg: '#FEF9C3', text: '#854D0E' },
  alto:  { label: '● Riesgo Alto',  bg: '#FEE2E2', text: '#991B1B' },
}

const PRIORIDAD_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  baja:    { label: 'Prioridad Baja',    bg: '#F3F4F6', text: '#374151' },
  media:   { label: 'Prioridad Media',   bg: '#EFF6FF', text: '#1D4ED8' },
  alta:    { label: 'Prioridad Alta',    bg: '#FFF7ED', text: '#C2410C' },
  urgente: { label: '🚨 Urgente',        bg: '#FEE2E2', text: '#991B1B' },
}

function Badge({ cfg }: { cfg: { label: string; bg: string; text: string; border?: string } }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={{ backgroundColor: cfg.bg, color: cfg.text, borderColor: cfg.border ?? cfg.bg }}>
      {cfg.label}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-700 mt-0.5">{value}</p>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} style={{ color: '#2AABBF' }} />
        <h2 className="text-sm font-semibold" style={{ color: '#1B2B4B' }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Alertas automáticas ───────────────────────────────────────
function AlertasOperativas({ lev }: { lev: LevantamientoPaciente }) {
  const alertas: { msg: string; color: string }[] = []

  if (lev.riesgo_final === 'alto') alertas.push({ msg: 'Paciente con riesgo alto: requiere revisión del jefe de enfermería.', color: 'red' })
  if (!lev.consentimiento?.autorizado_por) alertas.push({ msg: 'Falta autorización del responsable.', color: 'amber' })
  if (!lev.medicamentos?.length && lev.diagnostico_principal) alertas.push({ msg: 'No se registraron medicamentos — verificar si aplica.', color: 'amber' })
  if (!lev.costo_autorizado) alertas.push({ msg: 'Servicio pendiente de cotización o autorización de costo.', color: 'blue' })
  if (lev.estado === 'aprobado' && !lev.actividades_enfermeria?.length) alertas.push({ msg: 'Faltan actividades de enfermería definidas.', color: 'amber' })
  if (lev.estado === 'aprobado') alertas.push({ msg: 'Caso listo para asignación de personal.', color: 'green' })

  if (!alertas.length) return null

  const colorMap = {
    red:   { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B', icon: 'text-red-500' },
    amber: { bg: '#FEF9C3', border: '#FDE047', text: '#854D0E', icon: 'text-amber-500' },
    blue:  { bg: '#DBEAFE', border: '#93C5FD', text: '#1D4ED8', icon: 'text-blue-500' },
    green: { bg: '#DCFCE7', border: '#86EFAC', text: '#166534', icon: 'text-green-500' },
  }

  return (
    <div className="space-y-2">
      {alertas.map((a, i) => {
        const c = colorMap[a.color as keyof typeof colorMap]
        return (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border text-sm"
            style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}>
            <AlertTriangle size={15} className={`${c.icon} flex-shrink-0 mt-0.5`} />
            {a.msg}
          </div>
        )
      })}
    </div>
  )
}

// ── Cambio de estado ──────────────────────────────────────────
const TRANSICIONES: Record<string, { label: string; next: LevantamientoPaciente['estado'] }[]> = {
  borrador:           [{ label: 'Enviar a revisión', next: 'pendiente_revision' }],
  pendiente_revision: [{ label: 'Marcar como revisado', next: 'revisado' }, { label: 'Cancelar', next: 'cancelado' }],
  revisado:           [{ label: 'Aprobar', next: 'aprobado' }, { label: 'Cancelar', next: 'cancelado' }],
  aprobado:           [{ label: 'Convertir a servicio', next: 'convertido' }, { label: 'Cancelar', next: 'cancelado' }],
  convertido:         [],
  cancelado:          [{ label: 'Reabrir como borrador', next: 'borrador' }],
}

function AccionesEstado({ id, estado }: { id: string; estado: LevantamientoPaciente['estado'] }) {
  const [isPending, startTransition] = useTransition()
  const transiciones = TRANSICIONES[estado] ?? []

  if (!transiciones.length) return null

  function cambiar(next: LevantamientoPaciente['estado']) {
    startTransition(async () => {
      await cambiarEstadoLevantamiento(id, next)
      window.location.reload()
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transiciones.map(t => (
        <button key={t.next} type="button" disabled={isPending}
          onClick={() => cambiar(t.next)}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all disabled:opacity-50">
          {isPending ? '...' : t.label}
        </button>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
interface Props {
  lev: LevantamientoPaciente
}

export function LevantamientoDetalle({ lev }: Props) {
  const estadoCfg = ESTADO_CONFIG[lev.estado] ?? ESTADO_CONFIG.borrador
  const riesgoCfg = RIESGO_CONFIG[lev.riesgo_final] ?? RIESGO_CONFIG.bajo
  const prioridadCfg = PRIORIDAD_CONFIG[lev.prioridad] ?? PRIORIDAD_CONFIG.media

  const edad = lev.paciente_fecha_nacimiento
    ? Math.floor((Date.now() - new Date(lev.paciente_fecha_nacimiento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const signosVitales = lev.signos_vitales as Record<string, string>
  const entorno = lev.entorno as Record<string, boolean | string>
  const consentimiento = lev.consentimiento as Record<string, boolean | string>

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
              style={{ backgroundColor: '#1B2B4B' }}>
              {lev.paciente_nombre[0]}{lev.paciente_apellido[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>
                {lev.paciente_nombre} {lev.paciente_apellido}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {edad && <span className="text-sm text-gray-500">{edad} años</span>}
                {lev.paciente_sexo && <span className="text-gray-300">·</span>}
                {lev.paciente_sexo && <span className="text-sm text-gray-500 capitalize">{lev.paciente_sexo}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge cfg={estadoCfg} />
            <Badge cfg={riesgoCfg} />
            <Badge cfg={prioridadCfg} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AccionesEstado id={lev.id} estado={lev.estado} />
          <Link href={`/levantamientos/${lev.id}/editar`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:border-[#2AABBF] hover:text-[#2AABBF] transition-all bg-white">
            <Pencil size={14} /> Editar
          </Link>
        </div>
      </div>

      {/* Alertas */}
      <AlertasOperativas lev={lev} />

      {/* Resumen operativo */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg, #1B2B4B 0%, #162B4C 100%)' }}>
          <h2 className="text-white font-semibold">Resumen Operativo</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          <InfoRow label="Responsable" value={lev.responsable_nombre} />
          <InfoRow label="Teléfono responsable" value={lev.responsable_tel_principal} />
          <InfoRow label="Servicio solicitado" value={lev.tipos_servicio?.join(', ')} />
          <InfoRow label="Fecha estimada de inicio" value={lev.fecha_inicio_estimada} />
          <InfoRow label="Horario" value={lev.horario_requerido} />
          <InfoRow label="Tipo de turno" value={lev.tipo_turno?.replace(/_/g, ' ')} />
          <InfoRow label="Nivel de personal" value={lev.nivel_personal?.replace(/_/g, ' ')} />
          <InfoRow label="Personas requeridas" value={String(lev.num_personas_requeridas)} />
          <InfoRow label="Costo autorizado"
            value={lev.costo_autorizado ? `$${lev.costo_autorizado.toLocaleString()}` : 'Por definir'} />
          <InfoRow label="Responsable de pago" value={lev.responsable_pago} />
          <InfoRow label="Forma de pago" value={lev.forma_pago} />
          <InfoRow label="Supervisión" value={lev.requiere_supervision ? 'Sí' : 'No'} />
        </div>
      </div>

      {/* Diagnóstico y clínico */}
      <Section icon={Activity} title="Valoración Clínica">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Diagnóstico principal" value={lev.diagnostico_principal} />
          <InfoRow label="Diagnósticos secundarios" value={lev.diagnosticos_secundarios} />
          <InfoRow label="Médico tratante" value={lev.medico_tratante} />
          <InfoRow label="Hospital de referencia" value={lev.hospital_referencia} />
          <InfoRow label="Estado de conciencia" value={lev.estado_conciencia?.replace(/_/g, ' ')} />
          <InfoRow label="Movilidad" value={lev.movilidad?.replace(/_/g, ' ')} />
          <InfoRow label="Comunicación" value={lev.comunicacion?.replace(/_/g, ' ')} />
          <InfoRow label="Riesgo de caída" value={lev.riesgo_caida} />
          <InfoRow label="Alimentación" value={lev.alimentacion?.replace(/_/g, ' ')} />
          <InfoRow label="Evacuación/Orina" value={lev.evacuacion?.replace(/_/g, ' ')} />
        </div>
        {lev.orientacion?.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-1">Orientación</p>
            <div className="flex gap-2">{lev.orientacion.map(o => <span key={o} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">{o}</span>)}</div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {lev.usa_oxigeno && <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">Oxígeno {lev.litros_oxigeno && `· ${lev.litros_oxigeno}`}</span>}
          {lev.usa_sonda && <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">Sonda {lev.tipo_sonda && `· ${lev.tipo_sonda}`}</span>}
          {lev.usa_cateter && <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">Catéter</span>}
          {lev.usa_panal && <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">Pañal</span>}
          {lev.tiene_heridas && <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">Heridas</span>}
          {lev.tiene_dolor && <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs font-medium">Dolor {lev.escala_dolor !== null ? `${lev.escala_dolor}/10` : ''}</span>}
        </div>
        {lev.obs_clinicas && <p className="text-sm text-gray-600 mt-3 italic">{lev.obs_clinicas}</p>}
      </Section>

      {/* Signos vitales */}
      {Object.keys(signosVitales).length > 0 && (
        <Section icon={Activity} title="Signos Vitales Iniciales">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: 'presion_arterial', label: 'P. Arterial' },
              { key: 'frecuencia_cardiaca', label: 'FC (bpm)' },
              { key: 'frecuencia_respiratoria', label: 'FR' },
              { key: 'temperatura', label: 'Temp °C' },
              { key: 'saturacion_oxigeno', label: 'SpO2 %' },
              { key: 'glucosa_capilar', label: 'Glucosa' },
              { key: 'peso', label: 'Peso' },
              { key: 'talla', label: 'Talla' },
            ].filter(s => signosVitales[s.key]).map(s => (
              <div key={s.key} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-lg font-bold text-[#1B2B4B] mt-1">{signosVitales[s.key]}</p>
              </div>
            ))}
          </div>
          {signosVitales.fecha_hora && (
            <p className="text-xs text-gray-400 mt-2">Registrado: {new Date(signosVitales.fecha_hora).toLocaleString('es-MX')}</p>
          )}
        </Section>
      )}

      {/* Medicamentos */}
      {(lev.medicamentos?.length ?? 0) > 0 && (
        <Section icon={Pill} title={`Medicamentos (${lev.medicamentos!.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Medicamento', 'Dosis', 'Frecuencia', 'Vía', 'Horario', 'Indicado por'].map(h => (
                    <th key={h} className="text-left px-2 py-2 text-xs font-medium text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lev.medicamentos!.map((m, i) => (
                  <tr key={i}>
                    <td className="px-2 py-2 font-medium text-gray-700">{m.nombre}</td>
                    <td className="px-2 py-2 text-gray-600">{m.dosis || '—'}</td>
                    <td className="px-2 py-2 text-gray-600">{m.frecuencia || '—'}</td>
                    <td className="px-2 py-2 text-gray-600 capitalize">{m.via || '—'}</td>
                    <td className="px-2 py-2 text-gray-600">{m.horario || '—'}</td>
                    <td className="px-2 py-2 text-gray-600">{m.indicado_por || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lev.alergias && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs font-medium text-amber-700">⚠ Alergias: {lev.alergias}</p>
              {lev.alergias_medicamentos && <p className="text-xs text-amber-600 mt-1">Alergias a medicamentos: {lev.alergias_medicamentos}</p>}
            </div>
          )}
        </Section>
      )}

      {/* Actividades */}
      {lev.actividades_enfermeria?.length > 0 && (
        <Section icon={ClipboardList} title="Actividades de Enfermería">
          <div className="flex flex-wrap gap-1.5">
            {lev.actividades_enfermeria.map(a => (
              <span key={a} className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: '#EBF8FB', color: '#1B2B4B' }}>{a}</span>
            ))}
          </div>
          {lev.obs_actividades && <p className="text-sm text-gray-600 mt-3 italic">{lev.obs_actividades}</p>}
        </Section>
      )}

      {/* Materiales */}
      {(lev.materiales?.length ?? 0) > 0 && (
        <Section icon={Package} title={`Materiales y Equipo (${lev.materiales!.length})`}>
          <div className="space-y-1.5">
            {lev.materiales!.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium text-gray-700">{m.nombre} {m.cantidad && `· ${m.cantidad}`}</span>
                <div className="flex items-center gap-3">
                  {m.costo_estimado && <span className="text-xs text-gray-400">${m.costo_estimado}</span>}
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs capitalize">
                    {m.proporciona?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Contacto */}
        <Section icon={User} title="Responsable de Contacto">
          <div className="space-y-3">
            <InfoRow label="Nombre" value={lev.responsable_nombre} />
            <InfoRow label="Parentesco" value={lev.responsable_parentesco} />
            {lev.responsable_tel_principal && (
              <a href={`tel:${lev.responsable_tel_principal}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#2AABBF] transition-colors">
                <Phone size={14} /> {lev.responsable_tel_principal}
              </a>
            )}
            {lev.responsable_tel_alternativo && (
              <a href={`tel:${lev.responsable_tel_alternativo}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#2AABBF] transition-colors">
                <Phone size={14} /> {lev.responsable_tel_alternativo} (alt)
              </a>
            )}
            {lev.responsable_email && (
              <a href={`mailto:${lev.responsable_email}`}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#2AABBF] transition-colors">
                <Mail size={14} /> {lev.responsable_email}
              </a>
            )}
            {lev.responsable_es_pagador && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
                <CheckCircle size={11} /> Responsable de pago
              </span>
            )}
          </div>
        </Section>

        {/* Ubicación */}
        <Section icon={MapPin} title="Ubicación">
          <div className="space-y-2">
            {lev.paciente_domicilio && (
              <p className="text-sm text-gray-700">{lev.paciente_domicilio}</p>
            )}
            {lev.paciente_referencias && <p className="text-xs text-gray-500 italic">{lev.paciente_referencias}</p>}
            <InfoRow label="Ciudad / Estado"
              value={[lev.paciente_ciudad, lev.paciente_estado_geo].filter(Boolean).join(', ')} />
            <InfoRow label="C.P." value={lev.paciente_cp} />
          </div>
        </Section>
      </div>

      {/* Entorno */}
      {Object.keys(entorno).length > 0 && (
        <Section icon={Home} title="Evaluación del Entorno">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              ['acceso_dificil', 'Acceso difícil'], ['hay_escaleras', 'Escaleras'],
              ['hay_elevador', 'Elevador'], ['espacio_suficiente', 'Espacio suficiente'],
              ['bano_cercano', 'Baño cercano'], ['buena_iluminacion', 'Buena iluminación'],
              ['buena_ventilacion', 'Buena ventilación'], ['riesgo_caidas_domicilio', 'Riesgo de caídas'],
              ['hay_mascotas', 'Mascotas'], ['familiar_presente', 'Familiar presente'],
            ].filter(([k]) => entorno[k] !== undefined).map(([k, label]) => (
              <div key={k} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                entorno[k] ? 'bg-[#EBF8FB] text-[#1B2B4B]' : 'bg-gray-50 text-gray-400'
              }`}>
                <span>{entorno[k] ? '✓' : '✗'}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {entorno.tipo_vivienda && <InfoRow label="Tipo de vivienda" value={entorno.tipo_vivienda as string} />}
          {entorno.condiciones_higiene && <InfoRow label="Higiene" value={entorno.condiciones_higiene as string} />}
        </Section>
      )}

      {/* Costos */}
      <Section icon={DollarSign} title="Costos y Financiero">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-400">Costo estimado</p>
            <p className="text-xl font-bold text-[#1B2B4B] mt-1">
              {lev.costo_estimado ? `$${lev.costo_estimado.toLocaleString()}` : '—'}
            </p>
          </div>
          <div className="bg-[#EBF8FB] rounded-lg p-4">
            <p className="text-xs text-gray-500">Costo autorizado</p>
            <p className="text-xl font-bold mt-1" style={{ color: '#1B2B4B' }}>
              {lev.costo_autorizado ? `$${lev.costo_autorizado.toLocaleString()}` : 'Por definir'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <InfoRow label="Forma de pago" value={lev.forma_pago} />
          <InfoRow label="Responsable de pago" value={lev.responsable_pago} />
          <InfoRow label="Material incluido" value={lev.material_incluido} />
          <InfoRow label="Material no incluido" value={lev.material_no_incluido} />
        </div>
        {lev.obs_administrativas && <p className="text-sm text-gray-600 mt-2 italic">{lev.obs_administrativas}</p>}
      </Section>

      {/* Consentimiento */}
      <Section icon={CheckCircle} title="Consentimiento y Autorización">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Autorizado por" value={consentimiento.autorizado_por as string} />
          <InfoRow label="Relación" value={consentimiento.relacion_autoriza as string} />
          {consentimiento.fecha_autorizacion && (
            <InfoRow label="Fecha de autorización"
              value={new Date(consentimiento.fecha_autorizacion as string).toLocaleString('es-MX')} />
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { key: 'acepta_servicio', label: 'Condiciones del servicio' },
            { key: 'acepta_datos', label: 'Manejo de datos' },
            { key: 'acepta_evidencias', label: 'Evidencias clínicas' },
          ].map(({ key, label }) => (
            <span key={key} className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              consentimiento[key] ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400 line-through'
            }`}>
              {label}
            </span>
          ))}
        </div>
      </Section>

      {/* Meta */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          Creado: {new Date(lev.created_at).toLocaleString('es-MX')}
        </span>
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          Actualizado: {new Date(lev.updated_at).toLocaleString('es-MX')}
        </span>
        {(lev.levantador as { nombre: string; apellido: string } | undefined) && (
          <span>Por: {(lev.levantador as { nombre: string; apellido: string }).nombre} {(lev.levantador as { nombre: string; apellido: string }).apellido}</span>
        )}
      </div>
    </div>
  )
}
