'use server'

import { requireAuth } from './utils'

export type TipoMovimiento =
  | 'turno_creado'
  | 'turno_completado'
  | 'entrega_turno'
  | 'insumo_usado'
  | 'evento_cuidado'
  | 'cobranza'

export interface MovimientoBitacora {
  id: string
  tipo: TipoMovimiento
  fecha: string
  titulo: string
  descripcion?: string
  actor?: string
  caso_id?: string
  caso_titulo?: string
  paciente_nombre?: string
  metadata?: Record<string, unknown>
}

// ── Helpers ───────────────────────────────────────────────────

function sortDesc(items: MovimientoBitacora[]): MovimientoBitacora[] {
  return items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
}

// ── Global ─────────────────────────────────────────────────────

export async function getBitacoraGlobal(limite = 200): Promise<MovimientoBitacora[]> {
  const { supabase } = await requireAuth()
  const movimientos: MovimientoBitacora[] = []

  // 1. Turnos (creados y completados)
  const { data: turnos } = await supabase
    .from('turnos')
    .select(`
      id, status, fecha_inicio, fecha_fin, created_at,
      enfermero:enfermeros(nombre, apellido),
      caso:casos(id, titulo, paciente:pacientes(nombre, apellido))
    `)
    .order('created_at', { ascending: false })
    .limit(Math.floor(limite / 3))

  for (const t of turnos ?? []) {
    const enf = Array.isArray(t.enfermero) ? t.enfermero[0] : t.enfermero as { nombre: string; apellido: string } | null
    const caso = Array.isArray(t.caso) ? t.caso[0] : t.caso as { id: string; titulo: string; paciente?: { nombre: string; apellido: string } | null } | null
    const paciente = caso?.paciente ? (Array.isArray(caso.paciente) ? caso.paciente[0] : caso.paciente) as { nombre: string; apellido: string } | null : null

    movimientos.push({
      id: `turno-created-${t.id}`,
      tipo: 'turno_creado',
      fecha: t.created_at,
      titulo: enf ? `Turno asignado a ${enf.nombre} ${enf.apellido}` : 'Turno asignado',
      descripcion: `Inicio: ${new Date(t.fecha_inicio).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      actor: enf ? `${enf.nombre} ${enf.apellido}` : undefined,
      caso_id: caso?.id,
      caso_titulo: caso?.titulo,
      paciente_nombre: paciente ? `${paciente.nombre} ${paciente.apellido}` : undefined,
    })

    if (t.status === 'completado') {
      movimientos.push({
        id: `turno-completed-${t.id}`,
        tipo: 'turno_completado',
        fecha: t.fecha_fin ?? t.created_at,
        titulo: enf ? `Turno completado — ${enf.nombre} ${enf.apellido}` : 'Turno completado',
        actor: enf ? `${enf.nombre} ${enf.apellido}` : undefined,
        caso_id: caso?.id,
        caso_titulo: caso?.titulo,
        paciente_nombre: paciente ? `${paciente.nombre} ${paciente.apellido}` : undefined,
      })
    }
  }

  // 2. Entregas de turno
  const { data: entregas } = await supabase
    .from('entregas_turno')
    .select(`
      id, observaciones, incidentes, created_at,
      enfermero_saliente:enfermeros!enfermero_saliente_id(nombre, apellido),
      turno_saliente:turnos!turno_saliente_id(caso_id, caso:casos(id, titulo, paciente:pacientes(nombre, apellido)))
    `)
    .order('created_at', { ascending: false })
    .limit(Math.floor(limite / 3))

  for (const e of entregas ?? []) {
    const enf = Array.isArray(e.enfermero_saliente) ? e.enfermero_saliente[0] : e.enfermero_saliente as { nombre: string; apellido: string } | null
    const turno = Array.isArray(e.turno_saliente) ? e.turno_saliente[0] : e.turno_saliente as { caso_id?: string; caso?: { id: string; titulo: string; paciente?: { nombre: string; apellido: string } | null } | null } | null
    const caso = turno?.caso ? (Array.isArray(turno.caso) ? turno.caso[0] : turno.caso) as { id: string; titulo: string; paciente?: { nombre: string; apellido: string } | null } | null : null
    const paciente = caso?.paciente ? (Array.isArray(caso.paciente) ? caso.paciente[0] : caso.paciente) as { nombre: string; apellido: string } | null : null

    movimientos.push({
      id: `entrega-${e.id}`,
      tipo: 'entrega_turno',
      fecha: e.created_at,
      titulo: enf ? `Entrega de turno — ${enf.nombre} ${enf.apellido}` : 'Entrega de turno',
      descripcion: e.incidentes ? `Incidente: ${e.incidentes}` : e.observaciones?.slice(0, 120),
      actor: enf ? `${enf.nombre} ${enf.apellido}` : undefined,
      caso_id: caso?.id,
      caso_titulo: caso?.titulo,
      paciente_nombre: paciente ? `${paciente.nombre} ${paciente.apellido}` : undefined,
      metadata: { incidente: !!e.incidentes },
    })
  }

  // 3. Insumos usados
  const { data: insumos } = await supabase
    .from('insumos_usados')
    .select(`
      id, cantidad, costo_unitario, notas, fecha, created_at,
      insumo:insumos_catalogo(nombre, unidad),
      enfermero:enfermeros(nombre, apellido),
      caso:casos(id, titulo, paciente:pacientes(nombre, apellido))
    `)
    .order('fecha', { ascending: false })
    .limit(Math.floor(limite / 3))

  for (const i of insumos ?? []) {
    const enf = Array.isArray(i.enfermero) ? i.enfermero[0] : i.enfermero as { nombre: string; apellido: string } | null
    const ins = Array.isArray(i.insumo) ? i.insumo[0] : i.insumo as { nombre: string; unidad: string } | null
    const caso = Array.isArray(i.caso) ? i.caso[0] : i.caso as { id: string; titulo: string; paciente?: { nombre: string; apellido: string } | null } | null
    const paciente = caso?.paciente ? (Array.isArray(caso.paciente) ? caso.paciente[0] : caso.paciente) as { nombre: string; apellido: string } | null : null

    movimientos.push({
      id: `insumo-${i.id}`,
      tipo: 'insumo_usado',
      fecha: i.fecha ?? i.created_at,
      titulo: ins ? `${ins.nombre} — ${i.cantidad} ${ins.unidad}` : `Insumo usado (x${i.cantidad})`,
      descripcion: i.notas ?? undefined,
      actor: enf ? `${enf.nombre} ${enf.apellido}` : undefined,
      caso_id: caso?.id,
      caso_titulo: caso?.titulo,
      paciente_nombre: paciente ? `${paciente.nombre} ${paciente.apellido}` : undefined,
      metadata: { costo_total: (i.cantidad ?? 0) * (i.costo_unitario ?? 0) },
    })
  }

  // 4. Eventos del plan de cuidado (solo con status final)
  const { data: eventos } = await supabase
    .from('eventos_indicacion')
    .select(`
      id, status, fecha_hora_programada, fecha_hora_real, atendido_por, notas, created_at,
      indicacion:indicaciones(nombre, tipo, caso_id,
        caso:casos(id, titulo, paciente:pacientes(nombre, apellido))
      )
    `)
    .in('status', ['confirmado', 'omitido', 'reprogramado'])
    .order('fecha_hora_real', { ascending: false, nullsFirst: false })
    .limit(Math.floor(limite / 3))

  for (const ev of eventos ?? []) {
    const ind = Array.isArray(ev.indicacion) ? ev.indicacion[0] : ev.indicacion as { nombre: string; tipo: string; caso_id?: string; caso?: { id: string; titulo: string; paciente?: { nombre: string; apellido: string } | null } | null } | null
    const caso = ind?.caso ? (Array.isArray(ind.caso) ? ind.caso[0] : ind.caso) as { id: string; titulo: string; paciente?: { nombre: string; apellido: string } | null } | null : null
    const paciente = caso?.paciente ? (Array.isArray(caso.paciente) ? caso.paciente[0] : caso.paciente) as { nombre: string; apellido: string } | null : null

    const statusLabel = ev.status === 'confirmado' ? 'Confirmado' : ev.status === 'omitido' ? 'Omitido' : 'Reprogramado'

    movimientos.push({
      id: `evento-${ev.id}`,
      tipo: 'evento_cuidado',
      fecha: ev.fecha_hora_real ?? ev.created_at,
      titulo: ind ? `${ind.nombre} — ${statusLabel}` : `Evento de cuidado — ${statusLabel}`,
      descripcion: ev.notas ?? undefined,
      actor: ev.atendido_por ?? undefined,
      caso_id: caso?.id,
      caso_titulo: caso?.titulo,
      paciente_nombre: paciente ? `${paciente.nombre} ${paciente.apellido}` : undefined,
      metadata: { status: ev.status },
    })
  }

  // 5. Cobranza (pagos registrados)
  const { data: cobros } = await supabase
    .from('cobranza_items')
    .select(`
      id, concepto, subtotal, status, created_at,
      caso:casos(id, titulo, paciente:pacientes(nombre, apellido))
    `)
    .eq('status', 'pagado')
    .order('created_at', { ascending: false })
    .limit(50)

  for (const c of cobros ?? []) {
    const caso = Array.isArray(c.caso) ? c.caso[0] : c.caso as { id: string; titulo: string; paciente?: { nombre: string; apellido: string } | null } | null
    const paciente = caso?.paciente ? (Array.isArray(caso.paciente) ? caso.paciente[0] : caso.paciente) as { nombre: string; apellido: string } | null : null

    movimientos.push({
      id: `cobranza-${c.id}`,
      tipo: 'cobranza',
      fecha: c.created_at,
      titulo: `Cobro registrado — ${c.concepto}`,
      descripcion: `$${c.subtotal?.toFixed(2)}`,
      caso_id: caso?.id,
      caso_titulo: caso?.titulo,
      paciente_nombre: paciente ? `${paciente.nombre} ${paciente.apellido}` : undefined,
      metadata: { subtotal: c.subtotal },
    })
  }

  return sortDesc(movimientos)
}

// ── Por caso ────────────────────────────────────────────────────

export async function getBitacoraPorCaso(casoId: string): Promise<MovimientoBitacora[]> {
  const { supabase } = await requireAuth()
  const movimientos: MovimientoBitacora[] = []

  // Turnos del caso
  const { data: turnos } = await supabase
    .from('turnos')
    .select('id, status, fecha_inicio, fecha_fin, created_at, enfermero:enfermeros(nombre, apellido)')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })

  const turnoIds: string[] = []
  for (const t of turnos ?? []) {
    turnoIds.push(t.id)
    const enf = Array.isArray(t.enfermero) ? t.enfermero[0] : t.enfermero as { nombre: string; apellido: string } | null

    movimientos.push({
      id: `turno-created-${t.id}`,
      tipo: 'turno_creado',
      fecha: t.created_at,
      titulo: enf ? `Turno asignado a ${enf.nombre} ${enf.apellido}` : 'Turno asignado',
      descripcion: `Inicio: ${new Date(t.fecha_inicio).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
      actor: enf ? `${enf.nombre} ${enf.apellido}` : undefined,
    })

    if (t.status === 'completado') {
      movimientos.push({
        id: `turno-completed-${t.id}`,
        tipo: 'turno_completado',
        fecha: t.fecha_fin ?? t.created_at,
        titulo: enf ? `Turno completado — ${enf.nombre} ${enf.apellido}` : 'Turno completado',
        actor: enf ? `${enf.nombre} ${enf.apellido}` : undefined,
      })
    }
  }

  // Entregas del caso (via turno IDs)
  if (turnoIds.length > 0) {
    const { data: entregas } = await supabase
      .from('entregas_turno')
      .select(`
        id, observaciones, incidentes, created_at,
        enfermero_saliente:enfermeros!enfermero_saliente_id(nombre, apellido)
      `)
      .in('turno_saliente_id', turnoIds)
      .order('created_at', { ascending: false })

    for (const e of entregas ?? []) {
      const enf = Array.isArray(e.enfermero_saliente) ? e.enfermero_saliente[0] : e.enfermero_saliente as { nombre: string; apellido: string } | null
      movimientos.push({
        id: `entrega-${e.id}`,
        tipo: 'entrega_turno',
        fecha: e.created_at,
        titulo: enf ? `Entrega de turno — ${enf.nombre} ${enf.apellido}` : 'Entrega de turno',
        descripcion: e.incidentes ? `Incidente: ${e.incidentes}` : e.observaciones?.slice(0, 120),
        actor: enf ? `${enf.nombre} ${enf.apellido}` : undefined,
        metadata: { incidente: !!e.incidentes },
      })
    }
  }

  // Insumos del caso
  const { data: insumos } = await supabase
    .from('insumos_usados')
    .select(`
      id, cantidad, costo_unitario, notas, fecha, created_at,
      insumo:insumos_catalogo(nombre, unidad),
      enfermero:enfermeros(nombre, apellido)
    `)
    .eq('caso_id', casoId)
    .order('fecha', { ascending: false })

  for (const i of insumos ?? []) {
    const enf = Array.isArray(i.enfermero) ? i.enfermero[0] : i.enfermero as { nombre: string; apellido: string } | null
    const ins = Array.isArray(i.insumo) ? i.insumo[0] : i.insumo as { nombre: string; unidad: string } | null

    movimientos.push({
      id: `insumo-${i.id}`,
      tipo: 'insumo_usado',
      fecha: i.fecha ?? i.created_at,
      titulo: ins ? `${ins.nombre} — ${i.cantidad} ${ins.unidad}` : `Insumo usado (x${i.cantidad})`,
      descripcion: i.notas ?? undefined,
      actor: enf ? `${enf.nombre} ${enf.apellido}` : undefined,
      metadata: { costo_total: (i.cantidad ?? 0) * (i.costo_unitario ?? 0) },
    })
  }

  // Eventos del plan de cuidado del caso
  const { data: indicaciones } = await supabase
    .from('indicaciones')
    .select('id')
    .eq('caso_id', casoId)

  if (indicaciones?.length) {
    const indIds = indicaciones.map(i => i.id)
    const { data: eventos } = await supabase
      .from('eventos_indicacion')
      .select('id, status, fecha_hora_real, notas, atendido_por, created_at, indicacion:indicaciones(nombre)')
      .in('indicacion_id', indIds)
      .in('status', ['confirmado', 'omitido', 'reprogramado'])
      .order('fecha_hora_real', { ascending: false, nullsFirst: false })

    for (const ev of eventos ?? []) {
      const ind = Array.isArray(ev.indicacion) ? ev.indicacion[0] : ev.indicacion as { nombre: string } | null
      const statusLabel = ev.status === 'confirmado' ? 'Confirmado' : ev.status === 'omitido' ? 'Omitido' : 'Reprogramado'
      movimientos.push({
        id: `evento-${ev.id}`,
        tipo: 'evento_cuidado',
        fecha: ev.fecha_hora_real ?? ev.created_at,
        titulo: ind ? `${ind.nombre} — ${statusLabel}` : `Evento de cuidado — ${statusLabel}`,
        descripcion: ev.notas ?? undefined,
        actor: ev.atendido_por ?? undefined,
        metadata: { status: ev.status },
      })
    }
  }

  // Cobranza del caso
  const { data: cobros } = await supabase
    .from('cobranza_items')
    .select('id, concepto, subtotal, status, created_at')
    .eq('caso_id', casoId)
    .eq('status', 'pagado')
    .order('created_at', { ascending: false })

  for (const c of cobros ?? []) {
    movimientos.push({
      id: `cobranza-${c.id}`,
      tipo: 'cobranza',
      fecha: c.created_at,
      titulo: `Cobro registrado — ${c.concepto}`,
      descripcion: `$${c.subtotal?.toFixed(2)}`,
      metadata: { subtotal: c.subtotal },
    })
  }

  return sortDesc(movimientos)
}
