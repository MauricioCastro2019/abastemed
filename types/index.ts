// ============================================================
// ABASTEMED — Tipos base del sistema
// ============================================================

export type ContextoPaciente = 'domicilio' | 'hospital' | 'casa_reposo'
export type CategoriaInsumo = 'solucion' | 'medicamento' | 'material' | 'servicio' | 'otro'
export type StatusPaciente = 'activo' | 'cerrado'
export type StatusCaso = 'activo' | 'pausado' | 'cerrado'
export type StatusTurno = 'programado' | 'activo' | 'completado'
export type StatusCobranza = 'pendiente' | 'pagado'
export type RolUsuario = 'admin' | 'enfermero' | 'familiar' | 'jefe_enfermeros'

// ----------------------------------------------------------------
export interface Paciente {
  id: string
  nombre: string
  apellido: string
  fecha_nacimiento: string           // ISO date
  diagnostico: string
  medicamentos: string[]
  alergias: string[]
  contacto_familiar: ContactoFamiliar
  contexto: ContextoPaciente
  status: StatusPaciente
  created_at: string
}

export interface ContactoFamiliar {
  nombre: string
  telefono: string
  email?: string
  relacion: string
}

// ----------------------------------------------------------------
export interface Enfermero {
  id: string
  nombre: string
  apellido: string
  cedula: string
  especialidades: string[]
  telefono: string
  email: string
  foto_url?: string
  bio?: string
  cv_url?: string
  disponible: boolean
  rating: number                     // 0-5
  total_casos: number
  created_at: string
}

// ----------------------------------------------------------------
export interface Caso {
  id: string
  paciente_id: string
  titulo: string
  contexto: ContextoPaciente
  direccion: string
  fecha_inicio: string               // ISO date
  fecha_fin?: string                 // ISO date, nullable
  status: StatusCaso
  tarifa_hora: number                // en moneda local
  notas?: string
  created_at: string
  // Relaciones opcionales (para joins)
  paciente?: Paciente
}

// ----------------------------------------------------------------
export interface Turno {
  id: string
  caso_id: string
  enfermero_id: string
  fecha_inicio: string               // ISO datetime
  fecha_fin: string                  // ISO datetime
  horas_trabajadas: number
  status: StatusTurno
  notas_entrega?: string
  created_at: string
  // Relaciones opcionales
  caso?: Caso
  enfermero?: Enfermero
}

// ----------------------------------------------------------------
export interface SignosVitales {
  presion_arterial?: string          // ej: "120/80"
  frecuencia_cardiaca?: number       // bpm
  temperatura?: number               // °C
  saturacion_oxigeno?: number        // %
  frecuencia_respiratoria?: number   // rpm
  glucosa?: number                   // mg/dL
  peso?: number                      // kg
  observaciones?: string
}

export interface MedicamentoAdministrado {
  nombre: string
  dosis: string
  hora: string                       // HH:mm
  via: string                        // oral, IV, IM, etc.
  administrado: boolean
  observaciones?: string
}

export interface EntregaTurno {
  id: string
  turno_saliente_id: string
  turno_entrante_id: string
  enfermero_saliente_id: string
  enfermero_entrante_id: string
  signos_vitales: SignosVitales
  medicamentos_administrados: MedicamentoAdministrado[]
  observaciones: string
  incidentes?: string
  created_at: string
}

// ----------------------------------------------------------------
export interface CobranzaItem {
  id: string
  caso_id: string
  turno_id: string
  concepto: string
  horas: number
  tarifa: number
  subtotal: number
  status: StatusCobranza
  created_at: string
  // Relaciones opcionales
  caso?: Caso
  turno?: Turno
}

// ----------------------------------------------------------------
// Perfil de usuario (vinculado a auth.users de Supabase)
export interface PerfilUsuario {
  id: string                         // mismo que auth.users.id
  rol: RolUsuario
  nombre: string
  apellido: string
  email: string
  telefono?: string
  foto_url?: string
  // Referencia según rol
  enfermero_id?: string
  paciente_id?: string
  created_at: string
}

// ----------------------------------------------------------------
// Tipos de utilidad para UI
export interface MetricasDashboard {
  casos_activos: number
  enfermeros_disponibles: number
  turnos_hoy: number
  cobranza_pendiente: number
}

// ----------------------------------------------------------------
// Módulo de Recibos de Pago
export interface ReciboItem {
  id: string
  recibo_id: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  importe: number
  orden: number
}

export interface Recibo {
  id: string
  folio: string
  paciente_nombre: string
  fecha_emision: string              // ISO date YYYY-MM-DD
  subtotal: number
  total: number
  observaciones?: string | null
  creado_en: string
  actualizado_en: string
  // Relación opcional (cuando se hace join con recibo_items)
  recibo_items?: ReciboItem[]
}

// ----------------------------------------------------------------
// Módulo: Plan de Cuidado

export type TipoIndicacion =
  | 'medicamento_oral'
  | 'aplicacion_medicamento'
  | 'curacion'
  | 'signos_vitales'
  | 'terapia'
  | 'otra'

export type ViaAdministracion =
  | 'oral'
  | 'intravenosa'
  | 'intramuscular'
  | 'subcutanea'
  | 'topica'
  | 'inhalatoria'
  | 'sublingual'
  | 'nasal'
  | 'otra'

export type FrecuenciaIndicacion =
  | 'cada_4h'
  | 'cada_6h'
  | 'cada_8h'
  | 'cada_12h'
  | 'cada_24h'
  | 'lunes_miercoles_viernes'
  | 'una_vez'
  | 'segun_necesidad'

export type StatusEvento =
  | 'pendiente'
  | 'confirmado'
  | 'omitido'
  | 'reprogramado'
  | 'cancelado'

export interface Indicacion {
  id: string
  paciente_id: string
  caso_id?: string | null
  tipo: TipoIndicacion
  nombre: string
  dosis?: string | null
  via?: ViaAdministracion | null
  frecuencia: FrecuenciaIndicacion
  horarios: string[]                 // ['08:00', '14:00', '20:00']
  fecha_inicio: string               // ISO date
  fecha_fin?: string | null
  responsable?: string | null
  notas?: string | null
  activa: boolean
  created_at: string
  paciente?: Pick<Paciente, 'id' | 'nombre' | 'apellido'>
}

export interface EventoIndicacion {
  id: string
  indicacion_id: string
  paciente_id: string
  fecha_hora_programada: string      // ISO datetime
  status: StatusEvento
  fecha_hora_real?: string | null
  notas?: string | null
  atendido_por?: string | null
  created_at: string
  indicacion?: Indicacion & {
    paciente?: Pick<Paciente, 'id' | 'nombre' | 'apellido'>
  }
}

// ----------------------------------------------------------------
// Módulo: Levantamiento de Paciente

export type EstadoLevantamiento =
  | 'borrador'
  | 'pendiente_revision'
  | 'revisado'
  | 'aprobado'
  | 'convertido'
  | 'cancelado'

export type RiesgoNivel = 'bajo' | 'medio' | 'alto'
export type PrioridadNivel = 'baja' | 'media' | 'alta' | 'urgente'

export interface LevantamientoMedicamento {
  id?: string
  levantamiento_id?: string
  nombre: string
  dosis: string
  frecuencia: string
  via: string
  horario: string
  indicado_por: string
  observaciones: string
  orden?: number
}

export interface LevantamientoMaterial {
  id?: string
  levantamiento_id?: string
  nombre: string
  cantidad: string
  proporciona: string
  costo_estimado?: number | null
  observaciones: string
  orden?: number
}

export interface SignosVitalesLevantamiento {
  presion_arterial?: string
  frecuencia_cardiaca?: string
  frecuencia_respiratoria?: string
  temperatura?: string
  saturacion_oxigeno?: string
  glucosa_capilar?: string
  peso?: string
  talla?: string
  fecha_hora?: string
}

export interface EntornoLevantamiento {
  tipo_vivienda?: string
  acceso_dificil?: boolean
  hay_escaleras?: boolean
  hay_elevador?: boolean
  espacio_suficiente?: boolean
  bano_cercano?: boolean
  buena_iluminacion?: boolean
  buena_ventilacion?: boolean
  riesgo_caidas_domicilio?: boolean
  hay_mascotas?: boolean
  familiar_presente?: boolean
  condiciones_higiene?: string
  obs_entorno?: string
}

export interface ConsentimientoLevantamiento {
  autorizado_por?: string
  relacion_autoriza?: string
  fecha_autorizacion?: string
  acepta_servicio?: boolean
  acepta_datos?: boolean
  acepta_evidencias?: boolean
  obs_consentimiento?: string
}

export interface LevantamientoPaciente {
  id: string
  // Datos del paciente
  paciente_nombre: string
  paciente_apellido: string
  paciente_fecha_nacimiento?: string | null
  paciente_sexo?: string | null
  paciente_telefono?: string | null
  paciente_domicilio?: string | null
  paciente_referencias?: string | null
  paciente_ciudad?: string | null
  paciente_estado_geo?: string | null
  paciente_cp?: string | null
  paciente_obs_ubicacion?: string | null
  // Responsable
  responsable_nombre?: string | null
  responsable_parentesco?: string | null
  responsable_tel_principal?: string | null
  responsable_tel_alternativo?: string | null
  responsable_email?: string | null
  responsable_es_pagador: boolean
  responsable_obs?: string | null
  // Solicitud
  fecha_solicitud: string
  medio_contacto?: string | null
  persona_solicita?: string | null
  relacion_solicitante?: string | null
  motivo_general?: string | null
  urgencia_percibida: string
  // Servicio
  tipos_servicio: string[]
  descripcion_necesidad?: string | null
  expectativa_familia?: string | null
  obs_servicio?: string | null
  // Valoración clínica
  diagnostico_principal?: string | null
  diagnosticos_secundarios?: string | null
  medico_tratante?: string | null
  hospital_referencia?: string | null
  fecha_evento_reciente?: string | null
  estado_conciencia?: string | null
  orientacion: string[]
  comunicacion?: string | null
  movilidad?: string | null
  riesgo_caida?: string | null
  tiene_dolor: boolean
  escala_dolor?: number | null
  ubicacion_dolor?: string | null
  tiene_heridas: boolean
  descripcion_heridas?: string | null
  usa_oxigeno: boolean
  litros_oxigeno?: string | null
  dispositivo_oxigeno?: string | null
  usa_sonda: boolean
  tipo_sonda?: string | null
  usa_cateter: boolean
  tipo_cateter?: string | null
  usa_panal: boolean
  alimentacion?: string | null
  evacuacion?: string | null
  obs_clinicas?: string | null
  signos_vitales: SignosVitalesLevantamiento
  // Farmacología
  alergias?: string | null
  alergias_medicamentos?: string | null
  reacciones_previas?: string | null
  medicamentos_suspendidos?: string | null
  obs_farmacologicas?: string | null
  // Actividades
  actividades_enfermeria: string[]
  obs_actividades?: string | null
  // Entorno
  entorno: EntornoLevantamiento
  // Plan
  fecha_inicio_estimada?: string | null
  fecha_termino_estimada?: string | null
  tipo_turno?: string | null
  horario_requerido?: string | null
  frecuencia_servicio?: string | null
  num_personas_requeridas: number
  nivel_personal?: string | null
  requiere_supervision: boolean
  prioridad: PrioridadNivel
  // Riesgo
  riesgo_sugerido: RiesgoNivel
  riesgo_final: RiesgoNivel
  riesgo_modificado_manual: boolean
  // Costos
  costo_estimado?: number | null
  costo_autorizado?: number | null
  forma_pago?: string | null
  responsable_pago?: string | null
  material_incluido?: string | null
  material_no_incluido?: string | null
  obs_administrativas?: string | null
  // Consentimiento
  consentimiento: ConsentimientoLevantamiento
  // Control
  estado: EstadoLevantamiento
  levantado_por?: string | null
  created_at: string
  updated_at: string
  // Relaciones opcionales (joins)
  medicamentos?: LevantamientoMedicamento[]
  materiales?: LevantamientoMaterial[]
  levantador?: { nombre: string; apellido: string }
}

// ----------------------------------------------------------------
// Módulo de Insumos
export interface InsumoCatalogo {
  id: string
  nombre: string
  categoria: CategoriaInsumo
  unidad: string
  costo: number
  precio?: number | null
  descripcion?: string | null
  activo: boolean
  created_at: string
}

export interface InsumoUsado {
  id: string
  caso_id: string
  turno_id?: string | null
  enfermero_id: string
  insumo_id: string
  cantidad: number
  costo_unitario: number
  notas?: string | null
  fecha: string
  created_at: string
  // Relaciones opcionales
  insumo?: InsumoCatalogo
  enfermero?: Pick<Enfermero, 'id' | 'nombre' | 'apellido'>
  caso?: Pick<Caso, 'id' | 'titulo'>
}
