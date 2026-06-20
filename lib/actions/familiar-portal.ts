'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { zodActionError } from './utils'

// ============================================================
// HELPERS INTERNOS
// ============================================================

async function getContextoFamiliar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id, nombre, apellido, rol, paciente_id, parentesco, telefono, telefono_whatsapp, estado_invitacion')
    .eq('id', user.id)
    .single()

  if (!perfil) throw new Error('Perfil no encontrado')
  if (perfil.rol !== 'familiar') throw new Error('Acceso restringido a familiares')

  return { supabase, user, perfil }
}

async function verificarAccesoPaciente(supabase: Awaited<ReturnType<typeof createClient>>, uid: string, pacienteId: string): Promise<boolean> {
  // Verificar via familiar_paciente (nueva estructura)
  const { data: fp } = await supabase
    .from('familiar_paciente')
    .select('id')
    .eq('familiar_id', uid)
    .eq('paciente_id', pacienteId)
    .eq('activo', true)
    .maybeSingle()

  if (fp) return true

  // Fallback: verificar via perfiles.paciente_id (estructura heredada)
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('paciente_id')
    .eq('id', uid)
    .single()

  return perfil?.paciente_id === pacienteId
}

// ============================================================
// PACIENTES AUTORIZADOS
// ============================================================

export async function getMisPacientes() {
  const { supabase, user, perfil } = await getContextoFamiliar()

  // Intentar via familiar_paciente primero
  const { data: relaciones } = await supabase
    .from('familiar_paciente')
    .select(`
      id, paciente_principal, parentesco, permisos, activo,
      paciente:pacientes(id, nombre, apellido, fecha_nacimiento, diagnostico, alergias, contexto, status)
    `)
    .eq('familiar_id', user.id)
    .eq('activo', true)
    .order('paciente_principal', { ascending: false })

  if (relaciones && relaciones.length > 0) {
    return relaciones.map(r => ({
      relacion_id: r.id,
      paciente_principal: r.paciente_principal,
      parentesco: r.parentesco,
      permisos: r.permisos as Record<string, boolean>,
      paciente: (Array.isArray(r.paciente) ? r.paciente[0] : r.paciente) as unknown as {
        id: string; nombre: string; apellido: string
        fecha_nacimiento: string; diagnostico: string
        alergias: string[]; contexto: string; status: string
      },
    }))
  }

  // Fallback: paciente_id del perfil
  if (!perfil.paciente_id) return []

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id, nombre, apellido, fecha_nacimiento, diagnostico, alergias, contexto, status')
    .eq('id', perfil.paciente_id)
    .single()

  if (!paciente) return []

  return [{
    relacion_id: null,
    paciente_principal: true,
    parentesco: perfil.parentesco ?? null,
    permisos: {
      puede_ver_resumen_salud: true, puede_ver_reportes_resumidos: true,
      puede_ver_medicamentos: true, puede_ver_agenda: true,
      puede_ver_cobranza: true, puede_ver_recibos: true,
      puede_ver_citas: true, recibe_alertas: true, puede_comunicarse: true,
    } as Record<string, boolean>,
    paciente: paciente as {
      id: string; nombre: string; apellido: string
      fecha_nacimiento: string; diagnostico: string
      alergias: string[]; contexto: string; status: string
    },
  }]
}

// ============================================================
// CASO ACTIVO Y TURNOS (compatible con versión anterior)
// ============================================================

export async function getMiCaso(pacienteId?: string) {
  const { supabase, user, perfil } = await getContextoFamiliar()

  // Determinar paciente_id a usar
  let pid = pacienteId ?? perfil.paciente_id

  if (!pid) {
    // Buscar paciente principal en familiar_paciente
    const { data: fp } = await supabase
      .from('familiar_paciente')
      .select('paciente_id')
      .eq('familiar_id', user.id)
      .eq('paciente_principal', true)
      .eq('activo', true)
      .maybeSingle()
    pid = fp?.paciente_id ?? null
  }

  if (!pid) return { perfil, paciente: null, caso: null, turnos: [] }

  // Validar acceso
  const tieneAcceso = await verificarAccesoPaciente(supabase, user.id, pid)
  if (!tieneAcceso) throw new Error('Sin acceso a este paciente')

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id, nombre, apellido, fecha_nacimiento, diagnostico, alergias, contexto, status, medicamentos')
    .eq('id', pid)
    .single()

  const { data: caso } = await supabase
    .from('casos')
    .select('id, titulo, direccion, fecha_inicio, fecha_fin, status, contexto, horas_turno, horario_inicio, horario_fin')
    .eq('paciente_id', pid)
    .eq('status', 'activo')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let turnos: unknown[] = []
  if (caso) {
    const { data } = await supabase
      .from('turnos')
      .select('id, status, fecha_inicio, fecha_fin, notas_entrega, enfermero:enfermeros(nombre, apellido, telefono, especialidades, rating)')
      .eq('caso_id', caso.id)
      .neq('status', 'completado')
      .order('fecha_inicio', { ascending: true })
      .limit(5)
    turnos = data ?? []
  }

  return { perfil, paciente, caso, turnos }
}

// ============================================================
// DASHBOARD COMPLETO
// ============================================================

export async function getDashboardFamiliar(pacienteId?: string) {
  const { supabase, user, perfil } = await getContextoFamiliar()

  let pid = pacienteId ?? perfil.paciente_id
  if (!pid) {
    const { data: fp } = await supabase
      .from('familiar_paciente')
      .select('paciente_id')
      .eq('familiar_id', user.id)
      .eq('paciente_principal', true)
      .eq('activo', true)
      .maybeSingle()
    pid = fp?.paciente_id ?? null
  }
  if (!pid) return null

  const tieneAcceso = await verificarAccesoPaciente(supabase, user.id, pid)
  if (!tieneAcceso) throw new Error('Sin acceso a este paciente')

  // Permisos del familiar
  const { data: relacion } = await supabase
    .from('familiar_paciente')
    .select('permisos, parentesco, paciente_principal')
    .eq('familiar_id', user.id)
    .eq('paciente_id', pid)
    .maybeSingle()

  const permisos = (relacion?.permisos ?? {
    puede_ver_resumen_salud: true, puede_ver_reportes_resumidos: true,
    puede_ver_medicamentos: true, puede_ver_agenda: true, puede_ver_cobranza: true,
    puede_ver_citas: true, recibe_alertas: true, puede_comunicarse: true,
  }) as Record<string, boolean>

  // --- Consultas en paralelo ---
  const [pacienteR, casoR] = await Promise.all([
    supabase.from('pacientes')
      .select('id, nombre, apellido, fecha_nacimiento, diagnostico, alergias, contexto, status')
      .eq('id', pid).single(),
    supabase.from('casos')
      .select('id, titulo, direccion, fecha_inicio, status, contexto, horas_turno, horario_inicio, horario_fin, costo_guardia')
      .eq('paciente_id', pid).eq('status', 'activo')
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const paciente = pacienteR.data
  const caso = casoR.data

  if (!paciente) return null

  let ultimoReporte = null
  let medicamentosActivos: unknown[] = []
  let proximosTurnos: unknown[] = []
  let proximasCitas: unknown[] = []
  let resumenCobranza = null
  const alertas: { tipo: string; mensaje: string; gravedad: string }[] = []

  if (caso) {
    const ahora = new Date().toISOString()

    const [reporteR, medicosR, turnosR, citasR, cobranzaR] = await Promise.all([
      // Último reporte de turno
      supabase.from('reportes_turno')
        .select(`
          id, created_at, estado_general, estado_general_obs,
          signos_vitales, cuidados_realizados, obs_cuidados, pendientes,
          observaciones, resumen_para_familia, visible_para_familia,
          tipo_dieta, porcentaje_ingesta, obs_alimentacion,
          nausea, vomito, curaciones_realizadas,
          medicamentos_administrados,
          enfermero:enfermeros(nombre, apellido)
        `)
        .eq('caso_id', caso.id)
        .eq('visible_para_familia', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Medicamentos activos del kardex
      permisos.puede_ver_medicamentos
        ? supabase.from('kardex_medicamentos')
          .select('id, nombre, presentacion, dosis, via, frecuencia, horarios, estatus, existencia_domicilio, medico, observaciones')
          .eq('caso_id', caso.id)
          .eq('estatus', 'activo')
          .order('nombre')
        : Promise.resolve({ data: [] }),

      // Próximos turnos
      supabase.from('turnos')
        .select('id, status, fecha_inicio, fecha_fin, enfermero:enfermeros(nombre, apellido, telefono)')
        .eq('caso_id', caso.id)
        .neq('status', 'completado')
        .gte('fecha_inicio', ahora)
        .order('fecha_inicio', { ascending: true })
        .limit(3),

      // Próximas citas
      permisos.puede_ver_citas
        ? supabase.from('citas_medicas')
          .select('id, medico_nombre, especialidad, fecha, hora, ubicacion, estado, motivo, modalidad')
          .eq('paciente_id', pid)
          .eq('visible_para_familia', true)
          .gte('fecha', new Date().toISOString().split('T')[0])
          .in('estado', ['programada', 'confirmada'])
          .order('fecha', { ascending: true })
          .limit(3)
        : Promise.resolve({ data: [] }),

      // Cobranza resumida
      permisos.puede_ver_cobranza
        ? supabase.from('financial_incomes')
          .select('id, monto_total, monto_recibido, estatus, concepto, fecha_pago, tipo_ingreso')
          .eq('paciente_id', pid)
          .neq('estatus', 'cancelado')
          .order('created_at', { ascending: false })
          .limit(20)
        : Promise.resolve({ data: [] }),
    ])

    // Normalizar enfermero (Supabase join puede devolver array)
    if (reporteR.data) {
      const raw = reporteR.data as Record<string, unknown>
      if (Array.isArray(raw.enfermero)) raw.enfermero = raw.enfermero[0] ?? null
    }
    ultimoReporte = reporteR.data
    medicamentosActivos = medicosR.data ?? []
    proximosTurnos = turnosR.data ?? []
    proximasCitas = citasR.data ?? []

    const ingresos = (cobranzaR.data ?? []) as Array<{
      monto_total: number; monto_recibido: number; estatus: string
    }>
    const totalGenerado = ingresos.reduce((s, i) => s + (i.monto_total ?? 0), 0)
    const totalPagado = ingresos.reduce((s, i) => s + (i.monto_recibido ?? 0), 0)
    resumenCobranza = { totalGenerado, totalPagado, saldoPendiente: totalGenerado - totalPagado }

    // Generar alertas familiares
    const meds = medicamentosActivos as Array<{ nombre: string; existencia_domicilio: boolean }>
    meds.filter(m => !m.existencia_domicilio).forEach(m => {
      alertas.push({ tipo: 'medicamento_agotado', mensaje: `${m.nombre} no tiene existencia en domicilio`, gravedad: 'alta' })
    })
    if (resumenCobranza.saldoPendiente > 0) {
      alertas.push({ tipo: 'pago_pendiente', mensaje: `Saldo pendiente: $${resumenCobranza.saldoPendiente.toFixed(2)}`, gravedad: 'media' })
    }
    if (proximasCitas.length > 0) {
      const p = (proximasCitas[0] as { medico_nombre?: string; fecha: string })
      alertas.push({ tipo: 'cita_proxima', mensaje: `Cita con ${p.medico_nombre ?? 'médico'} el ${p.fecha}`, gravedad: 'baja' })
    }
  }

  return {
    perfil,
    parentesco: relacion?.parentesco ?? null,
    permisos,
    paciente,
    caso,
    ultimoReporte,
    medicamentosActivos,
    proximosTurnos,
    proximasCitas,
    resumenCobranza,
    alertas,
  }
}

// ============================================================
// EVOLUCIÓN Y REPORTES
// ============================================================

export async function getMisReportesTurno(casoId: string, limit = 20, offset = 0) {
  const { supabase, user } = await getContextoFamiliar()

  // Verificar que el caso pertenece a un paciente autorizado
  const { data: caso } = await supabase
    .from('casos')
    .select('paciente_id')
    .eq('id', casoId)
    .single()
  if (!caso) throw new Error('Caso no encontrado')

  const tieneAcceso = await verificarAccesoPaciente(supabase, user.id, caso.paciente_id)
  if (!tieneAcceso) throw new Error('Sin acceso')

  const { data, error } = await supabase
    .from('reportes_turno')
    .select(`
      id, created_at, estado_general, estado_general_obs,
      signos_vitales, cuidados_realizados, obs_cuidados,
      tipo_dieta, porcentaje_ingesta, obs_alimentacion, nausea, vomito,
      diuresis, evacuacion, obs_eliminacion,
      curaciones_realizadas, desc_curaciones, estado_piel,
      pendientes, observaciones, resumen_para_familia, visible_para_familia,
      medicamentos_administrados,
      enfermero:enfermeros(nombre, apellido)
    `)
    .eq('caso_id', casoId)
    .eq('visible_para_familia', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new Error(error.message)
  // Normalizar enfermero (Supabase join puede devolver array)
  return (data ?? []).map(r => {
    const raw = r as Record<string, unknown>
    if (Array.isArray(raw.enfermero)) raw.enfermero = raw.enfermero[0] ?? null
    return raw
  })
}

export async function getMisEntregas() {
  const { supabase, perfil } = await getContextoFamiliar()
  const pid = perfil.paciente_id
  if (!pid) return []

  const { data: caso } = await supabase
    .from('casos')
    .select('id')
    .eq('paciente_id', pid)
    .eq('status', 'activo')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!caso) return []

  const { data: turnos } = await supabase
    .from('turnos').select('id').eq('caso_id', caso.id)
  if (!turnos?.length) return []

  const { data } = await supabase
    .from('entregas_turno')
    .select(`
      id, observaciones, incidentes, signos_vitales, created_at,
      enfermero_saliente:enfermeros!enfermero_saliente_id(nombre, apellido),
      turno_saliente:turnos!turno_saliente_id(fecha_inicio, fecha_fin)
    `)
    .in('turno_saliente_id', turnos.map(t => t.id))
    .order('created_at', { ascending: false })
    .limit(10)

  return data ?? []
}

// ============================================================
// MEDICAMENTOS Y KARDEX
// ============================================================

export async function getMisKardex(casoId: string) {
  const { supabase, user } = await getContextoFamiliar()

  const { data: caso } = await supabase
    .from('casos').select('paciente_id').eq('id', casoId).single()
  if (!caso) throw new Error('Caso no encontrado')

  const tieneAcceso = await verificarAccesoPaciente(supabase, user.id, caso.paciente_id)
  if (!tieneAcceso) throw new Error('Sin acceso')

  const { data: kardex, error } = await supabase
    .from('kardex_medicamentos')
    .select('id, nombre, presentacion, dosis, via, frecuencia, horarios, fecha_inicio, fecha_suspension, medico, motivo, estatus, existencia_domicilio, observaciones, created_at')
    .eq('caso_id', casoId)
    .order('estatus', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) throw new Error(error.message)

  // Para cada medicamento activo, obtener últimas 3 administraciones
  const activos = (kardex ?? []).filter(k => k.estatus === 'activo')
  let administraciones: unknown[] = []

  if (activos.length > 0) {
    const { data: adms } = await supabase
      .from('administraciones_medicamento')
      .select('id, kardex_id, fecha_hora_programada, fecha_hora_administrada, status, observaciones')
      .in('kardex_id', activos.map(k => k.id))
      .order('fecha_hora_programada', { ascending: false })
      .limit(activos.length * 5)
    administraciones = adms ?? []
  }

  return { kardex: kardex ?? [], administraciones }
}

// ============================================================
// AGENDA UNIFICADA
// ============================================================

export async function getMiAgenda(casoId: string, pacienteId: string, desde: string, hasta: string) {
  const { supabase, user } = await getContextoFamiliar()

  const tieneAcceso = await verificarAccesoPaciente(supabase, user.id, pacienteId)
  if (!tieneAcceso) throw new Error('Sin acceso')

  const [turnosR, eventosR, citasR] = await Promise.all([
    supabase.from('turnos')
      .select('id, status, fecha_inicio, fecha_fin, enfermero:enfermeros(nombre, apellido, telefono)')
      .eq('caso_id', casoId)
      .gte('fecha_inicio', desde)
      .lte('fecha_inicio', hasta)
      .order('fecha_inicio', { ascending: true }),

    supabase.from('eventos_indicacion')
      .select(`
        id, fecha_hora_programada, status, notas, fecha_hora_real,
        indicacion:indicaciones(nombre, tipo, dosis, via, frecuencia)
      `)
      .eq('paciente_id', pacienteId)
      .gte('fecha_hora_programada', desde)
      .lte('fecha_hora_programada', hasta)
      .order('fecha_hora_programada', { ascending: true }),

    supabase.from('citas_medicas')
      .select('id, medico_nombre, especialidad, fecha, hora, ubicacion, estado, motivo, modalidad, preparacion')
      .eq('paciente_id', pacienteId)
      .eq('visible_para_familia', true)
      .gte('fecha', desde.split('T')[0])
      .lte('fecha', hasta.split('T')[0])
      .order('fecha', { ascending: true }),
  ])

  return {
    turnos: turnosR.data ?? [],
    eventos: eventosR.data ?? [],
    citas: citasR.data ?? [],
  }
}

// ============================================================
// CITAS MÉDICAS
// ============================================================

export async function getMisCitasMedicas(pacienteId: string) {
  const { supabase, user } = await getContextoFamiliar()

  const tieneAcceso = await verificarAccesoPaciente(supabase, user.id, pacienteId)
  if (!tieneAcceso) throw new Error('Sin acceso')

  const { data, error } = await supabase
    .from('citas_medicas')
    .select('id, medico_nombre, especialidad, medico_telefono, fecha, hora, ubicacion, modalidad, motivo, preparacion, responsable_acompanamiento, estado, resultado, seguimiento, proxima_cita_sugerida, created_at')
    .eq('paciente_id', pacienteId)
    .eq('visible_para_familia', true)
    .order('fecha', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ============================================================
// EXPEDIENTE DEL PACIENTE
// ============================================================

export async function getMiExpediente(pacienteId: string) {
  const { supabase, user } = await getContextoFamiliar()

  const tieneAcceso = await verificarAccesoPaciente(supabase, user.id, pacienteId)
  if (!tieneAcceso) throw new Error('Sin acceso')

  const { data: paciente } = await supabase
    .from('pacientes')
    .select('id, nombre, apellido, fecha_nacimiento, diagnostico, alergias, medicamentos, contexto, contacto_familiar, created_at')
    .eq('id', pacienteId)
    .single()

  const { data: caso } = await supabase
    .from('casos')
    .select('id, titulo, contexto, direccion, fecha_inicio, status, horas_turno, horario_inicio, horario_fin, notas')
    .eq('paciente_id', pacienteId)
    .eq('status', 'activo')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let indicaciones: unknown[] = []
  if (caso) {
    const { data } = await supabase
      .from('indicaciones')
      .select('id, nombre, tipo, dosis, via, frecuencia, horarios, fecha_inicio, fecha_fin, activa, responsable, notas')
      .eq('caso_id', caso.id)
      .eq('activa', true)
      .order('tipo', { ascending: true })
    indicaciones = data ?? []
  }

  return { paciente, caso, indicaciones }
}

// ============================================================
// COBRANZA Y RECIBOS
// ============================================================

export async function getMiCobranza(pacienteId: string) {
  const { supabase, user } = await getContextoFamiliar()

  const tieneAcceso = await verificarAccesoPaciente(supabase, user.id, pacienteId)
  if (!tieneAcceso) throw new Error('Sin acceso')

  const [ingresosR, recibosR] = await Promise.all([
    supabase.from('financial_incomes')
      .select('id, folio, fecha_pago, concepto, tipo_ingreso, periodo_cubierto_inicio, periodo_cubierto_fin, monto_total, monto_recibido, metodo_pago, estatus, referencia_pago, created_at')
      .eq('paciente_id', pacienteId)
      .neq('estatus', 'cancelado')
      .order('created_at', { ascending: false }),

    supabase.from('recibos')
      .select('id, folio, paciente_nombre, fecha_emision, subtotal, total, estado, metodo_pago, fecha_pago, referencia_pago')
      .ilike('paciente_nombre', `%${pacienteId}%`)
      .order('creado_en', { ascending: false })
      .limit(20),
  ])

  const ingresos = ingresosR.data ?? []
  const totalGenerado = ingresos.reduce((s, i) => s + (i.monto_total ?? 0), 0)
  const totalPagado = ingresos.reduce((s, i) => s + (i.monto_recibido ?? 0), 0)

  return {
    ingresos,
    recibos: recibosR.data ?? [],
    resumen: {
      totalGenerado,
      totalPagado,
      saldoPendiente: totalGenerado - totalPagado,
    },
  }
}

// ============================================================
// CONTACTO Y SOLICITUDES
// ============================================================

const SolicitudSchema = z.object({
  paciente_id: z.string().uuid().optional(),
  tipo: z.enum(['necesito_llamada', 'reportar_pago', 'duda_medicamento', 'confirmar_cita', 'solicitar_documento', 'informar_cambio', 'otro']),
  asunto: z.string().min(3, 'Indica el asunto').max(200),
  mensaje: z.string().max(2000).optional(),
})

export async function enviarSolicitudContacto(formData: FormData) {
  const { supabase, user } = await getContextoFamiliar()

  const parsed = SolicitudSchema.safeParse({
    paciente_id: formData.get('paciente_id') || undefined,
    tipo: formData.get('tipo'),
    asunto: formData.get('asunto'),
    mensaje: formData.get('mensaje') || undefined,
  })
  if (!parsed.success) return zodActionError(parsed.error)

  // Si hay paciente_id, verificar acceso
  if (parsed.data.paciente_id) {
    const tieneAcceso = await verificarAccesoPaciente(supabase, user.id, parsed.data.paciente_id)
    if (!tieneAcceso) return { error: 'Sin acceso al paciente indicado' }
  }

  const { error } = await supabase
    .from('solicitudes_familia')
    .insert({
      familiar_id: user.id,
      paciente_id: parsed.data.paciente_id ?? null,
      tipo: parsed.data.tipo,
      asunto: parsed.data.asunto,
      mensaje: parsed.data.mensaje ?? null,
      estado: 'pendiente',
    })

  if (error) return { error: error.message }
  return {}
}

export async function getMisSolicitudes() {
  const { supabase, user } = await getContextoFamiliar()

  const { data } = await supabase
    .from('solicitudes_familia')
    .select('id, tipo, asunto, mensaje, estado, respuesta, created_at, atendido_at')
    .eq('familiar_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return data ?? []
}

// ============================================================
// INCIDENCIAS VISIBLES
// ============================================================

export async function getMisIncidencias(casoId: string) {
  const { supabase, user } = await getContextoFamiliar()

  const { data: caso } = await supabase
    .from('casos').select('paciente_id').eq('id', casoId).single()
  if (!caso) throw new Error('Caso no encontrado')

  const tieneAcceso = await verificarAccesoPaciente(supabase, user.id, caso.paciente_id)
  if (!tieneAcceso) throw new Error('Sin acceso')

  const { data } = await supabase
    .from('incidencias')
    .select('id, tipo, descripcion, gravedad, intervencion, a_quien_se_aviso, estado_posterior, fecha_hora, created_at')
    .eq('caso_id', casoId)
    .eq('visible_para_familia', true)
    .order('fecha_hora', { ascending: false })
    .limit(20)

  return data ?? []
}
