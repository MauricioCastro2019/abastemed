'use server'

import { requireAuth } from './utils'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EntregaBandeja {
  id: string
  turno_id: string
  caso_id: string
  notas_coordinacion: string
  estado_paciente: 'mejor' | 'igual' | 'peor'
  created_at: string
  paciente_nombre: string
  paciente_apellido: string
  enfermero_nombre: string
  enfermero_apellido: string
}

export interface AlertaClinica {
  id: string
  caso_id: string
  tipo: string
  nivel: 'bajo' | 'moderado' | 'alto' | 'critico'
  descripcion: string | null
  created_at: string
  paciente_nombre: string
  paciente_apellido: string
}

export interface PendienteUrgente {
  id: string
  caso_id: string
  titulo: string
  prioridad: 'urgente' | 'alta'
  estado: string
  created_at: string
  paciente_nombre: string
  paciente_apellido: string
}

export interface SugerenciaAuto {
  key: string
  tipo: 'turno_sin_entrega'
  titulo: string
  descripcion: string
  caso_id: string
  href: string
  accion: string
}

export interface CentroMandoData {
  bandeja: EntregaBandeja[]
  alertasClinicas: AlertaClinica[]
  pendientesUrgentes: PendienteUrgente[]
  sugerencias: SugerenciaAuto[]
  totales: {
    bandeja: number
    alertasCriticas: number
    urgentes: number
  }
}

// ─── Orden de severidad ────────────────────────────────────────────────────

const NIVEL_ORDER: Record<string, number> = { critico: 4, alto: 3, moderado: 2, bajo: 1 }

// ─── Data fetch ────────────────────────────────────────────────────────────

export async function getCentroMandoData(): Promise<CentroMandoData> {
  try {
    const { supabase } = await requireAuth()
    const hace72h = new Date(Date.now() - 72 * 3600 * 1000).toISOString()
    const hace48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString()

    const [bandejaRes, alertasRes, pendientesRes, turnosRes, entregasRes] = await Promise.all([

      // Entregas de turno que solicitaron notificar al coordinador (últimas 72h)
      supabase
        .from('entregas_turno_guiadas')
        .select(`
          id, turno_id, caso_id, notas_coordinacion, estado_paciente, created_at,
          caso:casos(titulo, paciente:pacientes(nombre, apellido)),
          enfermero_saliente:perfiles!enfermero_saliente_id(nombre, apellido)
        `)
        .eq('notificar_coordinacion', true)
        .gte('created_at', hace72h)
        .order('created_at', { ascending: false })
        .limit(10),

      // Alertas clínicas activas en todos los casos del coordinador
      supabase
        .from('alertas_activas')
        .select(`
          id, caso_id, tipo, nivel, descripcion, created_at,
          caso:casos(titulo, paciente:pacientes(nombre, apellido))
        `)
        .eq('activa', true)
        .limit(30),

      // Pendientes urgentes/altos sin resolver
      supabase
        .from('pendientes_caso')
        .select(`
          id, caso_id, titulo, prioridad, estado, created_at,
          caso:casos(titulo, paciente:pacientes(nombre, apellido))
        `)
        .in('prioridad', ['urgente', 'alta'])
        .in('estado', ['pendiente', 'en_proceso'])
        .order('prioridad', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(20),

      // Turnos completados recientes (para detectar sin entrega)
      supabase
        .from('turnos')
        .select(`
          id, caso_id, fecha_fin,
          caso:casos(titulo, paciente:pacientes(nombre, apellido)),
          enfermero:enfermeros(nombre, apellido)
        `)
        .eq('status', 'completado')
        .gte('fecha_fin', hace48h)
        .order('fecha_fin', { ascending: false })
        .limit(30),

      // Entregas registradas en las últimas 48h (para filtrar turnos con entrega)
      supabase
        .from('entregas_turno_guiadas')
        .select('turno_id')
        .gte('created_at', hace48h),
    ])

    // ── Flatten bandeja ──────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bandeja: EntregaBandeja[] = ((bandejaRes.data ?? []) as any[]).map(e => ({
      id: e.id,
      turno_id: e.turno_id,
      caso_id: e.caso_id,
      notas_coordinacion: e.notas_coordinacion ?? '',
      estado_paciente: e.estado_paciente,
      created_at: e.created_at,
      paciente_nombre: e.caso?.paciente?.nombre ?? '',
      paciente_apellido: e.caso?.paciente?.apellido ?? '',
      enfermero_nombre: e.enfermero_saliente?.nombre ?? '',
      enfermero_apellido: e.enfermero_saliente?.apellido ?? '',
    }))

    // ── Flatten alertas (sorted by severity) ────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alertasClinicas: AlertaClinica[] = ((alertasRes.data ?? []) as any[])
      .map(a => ({
        id: a.id,
        caso_id: a.caso_id,
        tipo: a.tipo,
        nivel: a.nivel as AlertaClinica['nivel'],
        descripcion: a.descripcion ?? null,
        created_at: a.created_at,
        paciente_nombre: a.caso?.paciente?.nombre ?? '',
        paciente_apellido: a.caso?.paciente?.apellido ?? '',
      }))
      .sort((a, b) => (NIVEL_ORDER[b.nivel] ?? 0) - (NIVEL_ORDER[a.nivel] ?? 0))

    // ── Flatten pendientes urgentes ──────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendientesUrgentes: PendienteUrgente[] = ((pendientesRes.data ?? []) as any[]).map(p => ({
      id: p.id,
      caso_id: p.caso_id,
      titulo: p.titulo,
      prioridad: p.prioridad as PendienteUrgente['prioridad'],
      estado: p.estado,
      created_at: p.created_at,
      paciente_nombre: p.caso?.paciente?.nombre ?? '',
      paciente_apellido: p.caso?.paciente?.apellido ?? '',
    }))

    // ── Sugerencias automáticas: turnos completados sin entrega ─────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const turnosConEntrega = new Set((entregasRes.data ?? []).map((e: any) => e.turno_id))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const turnosSinEntrega = ((turnosRes.data ?? []) as any[]).filter(t => !turnosConEntrega.has(t.id))

    const sugerencias: SugerenciaAuto[] = turnosSinEntrega.slice(0, 5).map(t => ({
      key: `sin_entrega_${t.id}`,
      tipo: 'turno_sin_entrega' as const,
      titulo: 'Turno sin entrega registrada',
      descripcion: [
        t.caso?.paciente?.nombre, t.caso?.paciente?.apellido,
      ].filter(Boolean).join(' ')
        + ' — ' + [t.enfermero?.nombre, t.enfermero?.apellido].filter(Boolean).join(' ')
        + ' no registró entrega de turno',
      caso_id: t.caso_id,
      href: `/turnos/${t.id}`,
      accion: 'Ver turno',
    }))

    return {
      bandeja,
      alertasClinicas,
      pendientesUrgentes,
      sugerencias,
      totales: {
        bandeja: bandeja.length,
        alertasCriticas: alertasClinicas.filter(a => a.nivel === 'critico').length,
        urgentes: pendientesUrgentes.filter(p => p.prioridad === 'urgente').length,
      },
    }
  } catch {
    return {
      bandeja: [], alertasClinicas: [], pendientesUrgentes: [], sugerencias: [],
      totales: { bandeja: 0, alertasCriticas: 0, urgentes: 0 },
    }
  }
}
