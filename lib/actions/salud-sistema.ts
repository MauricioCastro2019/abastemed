'use server'

import { requireAuth } from './utils'
import type { ProblemaIntegridad, ResumenSaludSistema } from '@/types'

export async function getSaludSistema(): Promise<ResumenSaludSistema> {
  const { supabase } = await requireAuth()
  const problemas: ProblemaIntegridad[] = []

  // 1. Turnos completados sin reporte
  const { data: turnosSinReporte } = await supabase
    .from('turnos')
    .select('id, caso_id, enfermero_id, fecha_inicio, caso:casos(titulo), enfermero:enfermeros(nombre, apellido)')
    .eq('status', 'completado')
    .not('id', 'in', supabase.from('reportes_turno').select('turno_id'))
    .limit(50)

  for (const t of turnosSinReporte ?? []) {
    const enf  = Array.isArray(t.enfermero) ? t.enfermero[0] : t.enfermero as { nombre?: string; apellido?: string } | null
    problemas.push({
      entidad:             'turnos',
      entidad_id:          t.id,
      descripcion_entidad: `Turno del ${new Date(t.fecha_inicio).toLocaleDateString('es-MX')} — ${enf ? `${enf.nombre} ${enf.apellido}` : ''}`,
      problema:            'Turno completado sin reporte clínico',
      gravedad:            'alto',
      posible_solucion:    'Solicitar al enfermero que registre el reporte',
      url_correccion:      `/turnos/${t.id}/reporte`,
    })
  }

  // 2. Turnos validados sin partida de nómina
  const { data: turnosValidadosSinPayroll } = await supabase
    .from('turnos')
    .select('id, fecha_inicio, enfermero_id, caso:casos(titulo), enfermero:enfermeros(nombre, apellido)')
    .eq('validacion_status', 'validado')
    .not('id', 'in', supabase.from('payroll_items').select('turno_id').neq('estado_pago', 'cancelado'))
    .limit(50)

  for (const t of turnosValidadosSinPayroll ?? []) {
    const enf = Array.isArray(t.enfermero) ? t.enfermero[0] : t.enfermero as { nombre?: string; apellido?: string } | null
    problemas.push({
      entidad:             'turnos',
      entidad_id:          t.id,
      descripcion_entidad: `Turno validado del ${new Date(t.fecha_inicio).toLocaleDateString('es-MX')} — ${enf ? `${enf.nombre} ${enf.apellido}` : ''}`,
      problema:            'Turno validado sin incluir en corte de nómina',
      gravedad:            'medio',
      posible_solucion:    'Generar o actualizar el corte del periodo correspondiente',
      url_correccion:      '/cortes/nuevo',
    })
  }

  // 3. Turnos sin enfermero
  const { data: turnosSinEnfermero } = await supabase
    .from('turnos')
    .select('id, fecha_inicio, caso:casos(titulo)')
    .is('enfermero_id', null)
    .limit(30)

  for (const t of turnosSinEnfermero ?? []) {
    const caso = Array.isArray(t.caso) ? t.caso[0] : t.caso as { titulo?: string } | null
    problemas.push({
      entidad:             'turnos',
      entidad_id:          t.id,
      descripcion_entidad: `Turno del ${new Date(t.fecha_inicio).toLocaleDateString('es-MX')} — ${caso?.titulo ?? ''}`,
      problema:            'Turno sin enfermero asignado',
      gravedad:            'critico',
      posible_solucion:    'Asignar un enfermero al turno',
      url_correccion:      `/turnos/${t.id}`,
    })
  }

  // 4. Casos sin paciente
  const { data: casosSinPaciente } = await supabase
    .from('casos')
    .select('id, titulo')
    .is('paciente_id', null)
    .limit(30)

  for (const c of casosSinPaciente ?? []) {
    problemas.push({
      entidad:             'casos',
      entidad_id:          c.id,
      descripcion_entidad: c.titulo,
      problema:            'Caso sin paciente vinculado',
      gravedad:            'alto',
      posible_solucion:    'Vincular el caso a un paciente existente',
      url_correccion:      `/casos/${c.id}/editar`,
    })
  }

  // 5. (Verificación de ingresos — requiere RPC o cálculo en app, omitida en esta versión)

  // 6. Partidas de nómina sin turno
  const { data: itemsSinTurno } = await supabase
    .from('payroll_items')
    .select('id, periodo_id, enfermero_id, enfermero:enfermeros(nombre, apellido)')
    .is('turno_id', null)
    .neq('estado_pago', 'cancelado')
    .limit(20)

  for (const i of itemsSinTurno ?? []) {
    const enf = Array.isArray(i.enfermero) ? i.enfermero[0] : i.enfermero as { nombre?: string; apellido?: string } | null
    problemas.push({
      entidad:             'payroll_items',
      entidad_id:          i.id,
      descripcion_entidad: `Partida de ${enf ? `${enf.nombre} ${enf.apellido}` : 'enfermero desconocido'}`,
      problema:            'Partida de nómina sin turno relacionado',
      gravedad:            'medio',
      posible_solucion:    'Revisar si la partida fue creada manualmente o si el turno fue eliminado',
      url_correccion:      `/cortes/${i.periodo_id}`,
    })
  }

  // 7. Incidencias críticas sin resolución en más de 48h
  const hace48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { data: incidenciasCriticas } = await supabase
    .from('incidencias')
    .select('id, tipo, caso_id, caso:casos(titulo)', { count: 'exact' })
    .eq('gravedad', 'critica')
    .lt('fecha_hora', hace48h)
    .limit(20)

  for (const inc of incidenciasCriticas ?? []) {
    const caso = Array.isArray(inc.caso) ? inc.caso[0] : inc.caso as { titulo?: string } | null
    problemas.push({
      entidad:             'incidencias',
      entidad_id:          inc.id,
      descripcion_entidad: `Incidencia crítica — ${caso?.titulo ?? ''}`,
      problema:            'Incidencia crítica sin seguimiento en más de 48 horas',
      gravedad:            'critico',
      posible_solucion:    'Revisar y registrar el seguimiento de la incidencia',
      url_correccion:      `/casos/${inc.caso_id}/incidencias`,
    })
  }

  // 8. Alertas activas críticas
  const { data: alertasCriticas } = await supabase
    .from('alertas')
    .select('id, titulo, tipo, entidad_id')
    .eq('gravedad', 'critica')
    .eq('estado', 'activa')
    .limit(20)

  for (const a of alertasCriticas ?? []) {
    problemas.push({
      entidad:             'alertas',
      entidad_id:          a.id,
      descripcion_entidad: a.titulo,
      problema:            `Alerta crítica activa: ${a.titulo}`,
      gravedad:            'critico',
      posible_solucion:    'Atender y resolver la alerta',
      url_correccion:      a.entidad_id ? `/turnos/${a.entidad_id}` : '/dashboard',
    })
  }

  // Ordenar por gravedad
  const orden: Record<string, number> = { critico: 0, alto: 1, medio: 2, bajo: 3 }
  problemas.sort((a, b) => (orden[a.gravedad] ?? 4) - (orden[b.gravedad] ?? 4))

  return {
    total_problemas: problemas.length,
    criticos: problemas.filter(p => p.gravedad === 'critico').length,
    altos:    problemas.filter(p => p.gravedad === 'alto').length,
    medios:   problemas.filter(p => p.gravedad === 'medio').length,
    bajos:    problemas.filter(p => p.gravedad === 'bajo').length,
    problemas,
    generado_at: new Date().toISOString(),
  }
}
