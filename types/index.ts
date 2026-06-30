// ============================================================
// ABASTEMED — Tipos base del sistema
// ============================================================

export type ContextoPaciente = 'domicilio' | 'hospital' | 'casa_reposo'
export type CategoriaInsumo = 'solucion' | 'medicamento' | 'material' | 'servicio' | 'otro'
export type StatusPaciente = 'activo' | 'cerrado'
export type StatusCaso = 'activo' | 'pausado' | 'cerrado'
export type StatusTurno = 'programado' | 'activo' | 'completado'
export type ValidacionStatusTurno = 'pendiente' | 'en_revision' | 'validado' | 'rechazado' | 'en_aclaracion'
export type StatusCobranza = 'pendiente' | 'pagado'
export type RolUsuario = 'admin' | 'coordinador' | 'enfermero' | 'familiar' | 'superadmin' | 'administrativo' | 'auditor'

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
  coordinador_id?: string | null
  titulo: string
  contexto: ContextoPaciente
  direccion: string
  fecha_inicio: string               // ISO date
  fecha_fin?: string                 // ISO date, nullable
  status: StatusCaso
  tarifa_hora: number                // calculado: costo_guardia / horas_turno
  costo_guardia?: number | null      // costo total por guardia/turno
  horas_turno?: number | null        // duración del turno en horas (8, 12, 24)
  dias_semana?: string[]             // ['lunes','martes',...]
  horario_inicio?: string | null     // e.g. '07:00'
  horario_fin?: string | null        // e.g. '19:00'
  notas?: string
  created_at: string
  // Relaciones opcionales (para joins)
  paciente?: Paciente
  coordinador?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'> | null
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

// 'por_coordinar' es el valor de respaldo para recibos creados antes de
// que existiera este campo; no debe usarse como opción nueva en el formulario.
export type MetodoPagoRecibo = 'efectivo' | 'transferencia' | 'otro' | 'por_coordinar'

export type EstadoRecibo = 'pendiente' | 'pagado' | 'cancelado'

export interface Recibo {
  id: string
  folio: string
  paciente_nombre: string
  fecha_emision: string              // ISO date YYYY-MM-DD
  subtotal: number
  total: number
  observaciones?: string | null
  metodo_pago: MetodoPagoRecibo
  estado: EstadoRecibo
  fecha_pago?: string | null         // ISO date YYYY-MM-DD, solo si estado='pagado'
  referencia_pago?: string | null
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
  | 'en_revision'
  | 'requiere_correcciones'
  | 'requiere_revision_clinica'
  | 'requiere_revision_comercial'
  | 'revisado'
  | 'aprobado'
  | 'rechazado'
  | 'archivado'
  | 'sustituido'
  | 'convertido'
  | 'cancelado'

export type LevantamientoOrigen =
  | 'prelevantamiento'
  | 'urgencia_provisional'
  | 'migracion_historica'
  | 'manual'

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

// ----------------------------------------------------------------
// Tipos del flujo Prospecto → Levantamiento

export interface ProspectoElegible {
  prospect_id: string
  preassessment_id: string
  quote_id: string
  patient_name: string
  patient_age: number | null
  patient_gender: string | null
  diagnosis: string | null
  service_address: string | null
  city: string | null
  requester_name: string
  requester_phone: string
  relationship_to_patient: string
  physical_score: number
  clinical_score: number
  operational_score: number
  total_score: number
  risk_color: RiskColor
  recommended_profile: RecommendedProfile
  complexity_level: ComplexityLevel
  blocking_flags: string[]
  warning_flags: string[]
  final_price: number | null
  suggested_price: number
  calculated_price: number
  deposit_required: number | null
  payment_terms: string | null
  payment_method: string | null
  accepted_at: string | null
  requested_service_type: string | null
  shift_duration_hours: number | null
  requested_start_date: string | null
  prospect_created_at: string
  physical_alerts: string[]
  clinical_alerts: string[]
  operational_alerts: string[]
}

export type BloqueoStep =
  | 'prelevantamiento'
  | 'evaluacion_fisica'
  | 'evaluacion_clinica'
  | 'evaluacion_operativa'
  | 'resultado'
  | 'cotizacion'
  | 'aceptacion_cotizacion'
  | 'levantamiento_activo'

export interface ProspectoBloqueado {
  prospect_id: string
  patient_name: string
  requester_name: string
  prospect_status: ProspectoStatus
  blocking_reason: string
  blocking_step: BloqueoStep
  action_label: string
  action_url: string
  active_levantamiento_id: string | null
  prospect_created_at: string
}

// ----------------------------------------------------------------
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
  // Trazabilidad de flujo (post-migración)
  prospect_id?: string | null
  preassessment_id?: string | null
  cotizacion_id?: string | null
  resultado_evaluacion_id?: string | null
  levantamiento_origen?: LevantamientoOrigen | null
  score_prelevantamiento?: number | null
  score_levantamiento?: number | null
  diferencias_detectadas?: unknown[]
  requiere_revision_comercial?: boolean
  requiere_revision_clinica?: boolean
  datos_heredados_pendientes?: boolean
  motivo_archivo?: string | null
  archivado_por?: string | null
  archivado_at?: string | null
  sustituido_por?: string | null
  urgencia_motivo?: string | null
  urgencia_fecha_limite?: string | null
  costo_historico?: number | null
  costo_cotizado?: number | null
  costo_vigente?: number | null
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

// ----------------------------------------------------------------
// Módulo: Control Integral de Pacientes

export type EstadoGeneral =
  | 'alerta'
  | 'somnoliento'
  | 'confuso'
  | 'desorientado'
  | 'ansioso'
  | 'agitado'
  | 'cooperador'
  | 'no_cooperador'

export type GravedadIncidencia = 'leve' | 'moderada' | 'grave' | 'critica'

export type TipoIncidencia =
  | 'desaturacion'
  | 'hipotension'
  | 'fiebre'
  | 'confusion'
  | 'sincope'
  | 'caida'
  | 'casi_caida'
  | 'dolor_intenso'
  | 'vomito'
  | 'retencion_urinaria'
  | 'hematuria'
  | 'falla_equipo'
  | 'falta_insumo'
  | 'reaccion_medicamento'
  | 'otro'

export type EstatusKardex = 'activo' | 'suspendido' | 'temporal' | 'prn'

export type StatusAdministracion =
  | 'administrado'
  | 'omitido'
  | 'suspendido'
  | 'rechazado'
  | 'sin_existencia'
  | 'retrasado'

export interface SignosVitalesReporte {
  presion_arterial?: string
  frecuencia_cardiaca?: number
  temperatura?: number
  saturacion_sin_o2?: number
  saturacion_con_o2?: number
  litros_o2?: number
  soporte_o2?: string
  frecuencia_respiratoria?: number
  glucosa?: number
  peso?: number
  dolor_eva?: number
  observaciones?: string
}

export interface MedAdministradoReporte {
  kardex_id?: string
  nombre: string
  dosis: string
  via: string
  hora_programada: string
  hora_administrada?: string
  status: StatusAdministracion
  observaciones?: string
}

export interface ReporteTurno {
  id: string
  turno_id: string
  caso_id: string
  enfermero_id: string
  registrado_por?: string | null
  signos_vitales: SignosVitalesReporte
  estado_general?: EstadoGeneral | null
  estado_general_obs?: string | null
  tipo_dieta?: string | null
  porcentaje_ingesta?: number | null
  liquidos_ingeridos?: string | null
  nausea: boolean
  vomito: boolean
  dificultad_deglucion: boolean
  obs_alimentacion?: string | null
  diuresis?: string | null
  caracteristicas_orina?: string | null
  vol_drenado_sonda?: string | null
  evacuacion: boolean
  evacuacion_cantidad?: string | null
  evacuacion_consistencia?: string | null
  evacuacion_color?: string | null
  uso_panal: boolean
  obs_eliminacion?: string | null
  cuidados_realizados: string[]
  obs_cuidados?: string | null
  estado_piel?: string | null
  zonas_enrojecidas?: string | null
  curaciones_realizadas: boolean
  desc_curaciones?: string | null
  cambios_posturales_num?: number | null
  obs_piel?: string | null
  medicamentos_administrados: MedAdministradoReporte[]
  pendientes?: string | null
  observaciones?: string | null
  created_at: string
  // Relaciones opcionales
  turno?: Pick<Turno, 'id' | 'fecha_inicio' | 'fecha_fin'>
  enfermero?: Pick<Enfermero, 'id' | 'nombre' | 'apellido'>
}

export interface KardexMedicamento {
  id: string
  caso_id: string
  nombre: string
  presentacion?: string | null
  dosis?: string | null
  via?: string | null
  frecuencia?: string | null
  horarios: string[]
  fecha_inicio?: string | null
  fecha_suspension?: string | null
  medico?: string | null
  motivo?: string | null
  estatus: EstatusKardex
  existencia_domicilio: boolean
  observaciones?: string | null
  creado_por?: string | null
  created_at: string
  updated_at: string
  // Relaciones opcionales
  administraciones?: AdministracionMedicamento[]
}

export interface AdministracionMedicamento {
  id: string
  kardex_id: string
  reporte_turno_id?: string | null
  enfermero_id?: string | null
  fecha_hora_programada?: string | null
  fecha_hora_administrada?: string | null
  status: StatusAdministracion
  observaciones?: string | null
  created_at: string
  enfermero?: Pick<Enfermero, 'id' | 'nombre' | 'apellido'>
}

export interface Incidencia {
  id: string
  caso_id: string
  turno_id?: string | null
  reporte_turno_id?: string | null
  tipo: TipoIncidencia
  descripcion: string
  signos_vitales: SignosVitalesReporte
  intervencion?: string | null
  a_quien_se_aviso?: string | null
  respuesta?: string | null
  estado_posterior?: string | null
  gravedad: GravedadIncidencia
  reportado_por?: string | null
  fecha_hora: string
  created_at: string
  // Relaciones opcionales
  turno?: Pick<Turno, 'id' | 'fecha_inicio'>
  reportado_por_perfil?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'>
}

// ============================================================
// MÓDULO: Evaluación Inicial de Cuidado y Cotizador Inteligente
// ============================================================

export type ProspectoStatus =
  | 'nuevo'
  | 'prelevantamiento_iniciado'
  | 'informacion_incompleta'
  | 'requiere_valoracion'
  | 'cotizacion_generada'
  | 'propuesta_enviada'
  | 'propuesta_aceptada'
  | 'en_validacion'
  | 'en_espera_de_pago'
  | 'listo_para_activar'
  | 'paciente_activo'
  | 'rechazado'
  | 'cancelado'

export type RiskColor = 'verde' | 'amarillo' | 'naranja' | 'rojo'
export type ComplexityLevel = 'bajo' | 'medio' | 'alto' | 'especializado'
export type RecommendedProfile = 'cuidador' | 'auxiliar' | 'enfermero_general' | 'enfermero_especializado'
export type ClinicalAlertLevel = 'verde' | 'amarillo' | 'naranja' | 'rojo'
export type QuoteStatus =
  | 'borrador'
  | 'calculada'
  | 'pendiente_revision'
  | 'lista_para_enviar'
  | 'enviada'
  | 'aceptada'
  | 'rechazada'
  | 'vencida'
  | 'convertida_a_servicio'

export type DocumentType =
  | 'whatsapp_corto'
  | 'propuesta_formal'
  | 'resumen_interno'
  | 'condiciones_comerciales'
  | 'seguimiento'
  | 'plan_inicial_cuidado'

export interface Prospect {
  id: string
  requester_name: string
  requester_phone: string
  requester_whatsapp?: string | null
  requester_email?: string | null
  relationship_to_patient: string
  is_authorizer: boolean
  authorization_responsible_name?: string | null
  is_payer: boolean
  payment_responsible_name?: string | null
  payment_responsible_phone?: string | null
  source: string
  urgency: string
  is_urgent: boolean
  status: ProspectoStatus
  initial_observations?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  // Relaciones opcionales
  preassessment?: PatientPreassessment
  assessment_result?: AssessmentResult
  care_quote?: CareQuote
}

export interface PatientPreassessment {
  id: string
  prospect_id: string
  patient_name: string
  patient_age?: number | null
  patient_gender?: string | null
  service_address?: string | null
  neighborhood?: string | null
  city?: string | null
  approximate_weight?: number | null
  diagnosis?: string | null
  doctor_name?: string | null
  hospital_reference?: string | null
  currently_hospitalized: boolean
  current_location?: string | null
  general_observations?: string | null
  created_at: string
  updated_at: string
  // Relaciones opcionales
  physical_assessment?: PhysicalAssessment
  clinical_assessment?: ClinicalAssessment
  operational_assessment?: OperationalRiskAssessment
}

export interface PhysicalAssessment {
  id: string
  preassessment_id: string
  mobility_status: number
  fall_risk: number
  bed_status: number
  position_changes: number
  diaper_or_bathroom: number
  hygiene_support: number
  feeding_status: number
  hydration_support: number
  night_watch_status: number
  daily_life_support: number
  physical_score: number
  physical_level: string
  physical_alerts: string[]
  created_at: string
  updated_at: string
}

export interface ClinicalAssessment {
  id: string
  preassessment_id: string
  medication_status: number
  injectable_medications: number
  vital_signs_frequency: number
  glucose_control: number
  oxygen_use: number
  nebulizations: number
  devices_score: number
  devices_list: string[]
  wound_care: number
  pain_status: number
  postoperative_status: number
  postoperative_notes?: Record<string, string> | null
  neurological_events: number
  secretion_aspiration: number
  fluid_output_record: number
  medical_indications_status: number
  emergency_contact_status: number
  clinical_score: number
  clinical_level: string
  clinical_alert_level: ClinicalAlertLevel
  clinical_alerts: string[]
  minimum_clinical_profile?: string | null
  created_at: string
  updated_at: string
}

export interface OperationalRiskAssessment {
  id: string
  preassessment_id: string
  orientation_status: number
  cognitive_impairment: number
  agitation_or_aggression: number
  device_removal_risk: number
  communication_ability: number
  emotional_state: number
  family_decision_structure: number
  payment_clarity: number
  family_conflict_level: number
  service_expectations: number
  supplies_availability: number
  home_safety: number
  operational_score: number
  operational_level: string
  operational_alerts: string[]
  requires_written_agreements: boolean
  requires_payment_before: boolean
  created_at: string
  updated_at: string
}

export interface ServiceRequest {
  id: string
  prospect_id: string
  preassessment_id?: string | null
  requested_service_type?: string | null
  recommended_service_type?: string | null
  shift_duration_hours?: number | null
  shift_schedule?: string | null
  frequency?: string | null
  requested_start_date?: string | null
  estimated_duration?: string | null
  staff_preference: string[]
  report_type?: string | null
  supervision_type?: string | null
  medication_control_type?: string | null
  supplies_handling?: string | null
  payment_method?: string | null
  payment_frequency?: string | null
  location_type?: string | null
  commercial_notes?: string | null
  created_at: string
  updated_at: string
}

export interface AssessmentResult {
  id: string
  preassessment_id: string
  prospect_id: string
  physical_score: number
  clinical_score: number
  operational_score: number
  total_score: number
  general_complexity_level: ComplexityLevel
  risk_color: RiskColor
  recommended_profile: RecommendedProfile
  requires_in_person_assessment: boolean
  requires_formal_proposal: boolean
  requires_clinical_supervision: boolean
  requires_mandatory_log: boolean
  requires_advance_payment: boolean
  blocking_flags: string[]
  warning_flags: string[]
  internal_recommendation?: string | null
  created_at: string
  updated_at: string
}

export interface CareQuote {
  id: string
  prospect_id: string
  preassessment_id?: string | null
  service_request_id?: string | null
  assessment_result_id?: string | null
  base_rate: number
  physical_adjustment: number
  clinical_adjustment: number
  operational_adjustment: number
  schedule_adjustment: number
  urgency_adjustment: number
  location_adjustment: number
  supervision_fee: number
  report_fee: number
  medication_control_fee: number
  supplies_management_fee: number
  calculated_price: number
  suggested_price: number
  minimum_recommended_price: number
  final_price?: number | null
  adjustment_reason?: string | null
  authorized_by?: string | null
  deposit_required?: number | null
  payment_terms?: string | null
  quote_valid_until?: string | null
  status: QuoteStatus
  created_at: string
  updated_at: string
  adjustments?: QuoteAdjustment[]
}

export interface QuoteAdjustment {
  id: string
  care_quote_id: string
  adjustment_type: string
  description: string
  percentage?: number | null
  fixed_amount?: number | null
  calculated_amount: number
  created_at: string
}

export interface GeneratedDocument {
  id: string
  prospect_id: string
  care_quote_id?: string | null
  document_type: DocumentType
  title: string
  content: string
  status: string
  sent_at?: string | null
  accepted_at?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface ActivationChecklist {
  id: string
  prospect_id: string
  preassessment_id?: string | null
  care_quote_id?: string | null
  patient_data_complete: boolean
  address_confirmed: boolean
  payment_responsible_confirmed: boolean
  emergency_contact_confirmed: boolean
  final_price_authorized: boolean
  deposit_registered: boolean
  terms_accepted: boolean
  medical_indications_available: boolean
  medication_list_available: boolean
  supplies_ready: boolean
  assessment_completed_if_required: boolean
  staff_profile_confirmed: boolean
  start_date_confirmed: boolean
  is_ready_to_activate: boolean
  missing_items: string[]
  validated_by?: string | null
  validated_at?: string | null
  created_at: string
  updated_at: string
}

export interface CarePlan {
  id: string
  patient_id?: string | null
  prospect_id?: string | null
  preassessment_id?: string | null
  plan_type: string
  service_type?: string | null
  shift_duration_hours?: number | null
  shift_schedule?: string | null
  frequency?: string | null
  required_profile?: string | null
  main_needs: string[]
  care_instructions?: string | null
  medication_instructions?: string | null
  monitoring_instructions?: string | null
  reporting_instructions?: string | null
  restrictions?: string | null
  alerts: string[]
  emergency_plan?: string | null
  status: string
  created_by?: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// MÓDULO FINANCIERO
// ============================================================

export type TipoIngreso =
  | 'anticipo'
  | 'pago_servicio'
  | 'pago_semanal'
  | 'pago_mensual'
  | 'pago_parcial'
  | 'regularizacion_adeudo'
  | 'reembolso'
  | 'otro_ingreso'

export type TipoSalida =
  | 'pago_enfermero'
  | 'pago_jefe_enfermeria'
  | 'pago_coordinador'
  | 'insumos_medicos'
  | 'medicamentos'
  | 'traslado'
  | 'viaticos'
  | 'comida'
  | 'comision'
  | 'publicidad'
  | 'papeleria'
  | 'equipo_medico'
  | 'uniformes'
  | 'plataforma_software'
  | 'reembolso'
  | 'otro_gasto'

export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'deposito' | 'otro'

export type StatusIngreso = 'pendiente' | 'parcial' | 'confirmado' | 'cancelado' | 'en_revision'

export type StatusSalida = 'pendiente' | 'pagado' | 'por_comprobar' | 'cancelado' | 'en_revision'

export interface FinancialIncome {
  id: string
  folio: string
  fecha_pago: string
  paciente_id?: string | null
  caso_id?: string | null
  responsable_pago_nombre: string
  responsable_pago_contacto?: string | null
  concepto: string
  tipo_ingreso: TipoIngreso
  periodo_cubierto_inicio?: string | null
  periodo_cubierto_fin?: string | null
  fecha_limite_pago?: string | null
  monto_total: number
  monto_recibido: number
  metodo_pago: MetodoPago
  cuenta_receptora?: string | null
  referencia_pago?: string | null
  comprobante_url?: string | null
  estatus: StatusIngreso
  observaciones?: string | null
  registrado_por?: string | null
  cancelado_por?: string | null
  motivo_cancelacion?: string | null
  fecha_cancelacion?: string | null
  created_at: string
  updated_at: string
  // Relaciones opcionales
  paciente?: Pick<Paciente, 'id' | 'nombre' | 'apellido'>
  caso?: Pick<Caso, 'id' | 'titulo'>
}

export interface FinancialExpense {
  id: string
  folio: string
  fecha_salida: string
  tipo_salida: TipoSalida
  beneficiario_nombre: string
  beneficiario_contacto?: string | null
  enfermero_id?: string | null
  paciente_id?: string | null
  caso_id?: string | null
  concepto: string
  monto: number
  metodo_pago: MetodoPago
  cuenta_origen?: string | null
  referencia_pago?: string | null
  comprobante_url?: string | null
  estatus: StatusSalida
  observaciones?: string | null
  registrado_por?: string | null
  cancelado_por?: string | null
  motivo_cancelacion?: string | null
  fecha_cancelacion?: string | null
  created_at: string
  updated_at: string
  // Relaciones opcionales
  paciente?: Pick<Paciente, 'id' | 'nombre' | 'apellido'>
  caso?: Pick<Caso, 'id' | 'titulo'>
  enfermero?: Pick<Enfermero, 'id' | 'nombre' | 'apellido'>
}

export interface BalancePaciente {
  paciente: Paciente
  ingresos_confirmados: number
  ingresos_parciales: number
  ingresos_pendientes: number
  total_por_cobrar: number
  salidas_pagadas: number
  salidas_pendientes: number
  utilidad_estimada: number
  margen_estimado: number
  incomes: FinancialIncome[]
  expenses: FinancialExpense[]
}

export interface DashboardFinanciero {
  ingresos_hoy: number
  salidas_hoy: number
  utilidad_hoy: number
  ingresos_semana: number
  salidas_semana: number
  utilidad_semana: number
  ingresos_mes: number
  salidas_mes: number
  utilidad_mes: number
  cuentas_por_cobrar: number
  cuentas_por_pagar: number
  pacientes_con_adeudo: number
  pagos_pendientes_personal: number
  gastos_por_comprobar: number
  total_ingresos_activos: number
  total_salidas_activas: number
}

// ============================================================
// MÓDULO NÓMINA — Cortes y pagos de personal
// ============================================================

export type EstadoPayrollPeriod =
  | 'borrador'
  | 'en_revision'
  | 'validado'
  | 'autorizado'
  | 'parcialmente_pagado'
  | 'pagado'
  | 'cerrado'
  | 'cancelado'

export type EstadoValidacionPayrollItem = 'pendiente' | 'validado' | 'rechazado' | 'en_aclaracion'
export type EstadoPagoPayrollItem = 'pendiente' | 'autorizado' | 'pagado' | 'cancelado'

export interface PayrollPeriod {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  fecha_corte?: string | null
  fecha_programada_pago?: string | null
  estado: EstadoPayrollPeriod
  total_turnos: number
  total_horas: number
  total_bruto: number
  total_ajustes: number
  total_pagar: number
  observaciones?: string | null
  created_by?: string | null
  reviewed_by?: string | null
  reviewed_at?: string | null
  approved_by?: string | null
  approved_at?: string | null
  paid_at?: string | null
  cancelled_by?: string | null
  motivo_cancelacion?: string | null
  created_at: string
  updated_at: string
  // Relaciones opcionales
  creador?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'> | null
  aprobador?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'> | null
  items?: PayrollItem[]
}

export interface PayrollItem {
  id: string
  periodo_id: string
  enfermero_id: string
  turno_id?: string | null
  caso_id?: string | null
  paciente_id?: string | null
  horas_programadas: number
  horas_reales: number
  horas_pagables: number
  tarifa_hora: number
  importe_base: number
  horas_extra: number
  tarifa_hora_extra: number
  importe_extra: number
  apoyo_transporte: number
  bono: number
  descuento: number
  ajuste: number
  motivo_ajuste?: string | null
  total_pagar: number
  estado_validacion: EstadoValidacionPayrollItem
  validado_por?: string | null
  validado_at?: string | null
  estado_pago: EstadoPagoPayrollItem
  financial_expense_id?: string | null
  metodo_pago?: string | null
  referencia_pago?: string | null
  comprobante_url?: string | null
  pagado_at?: string | null
  pagado_por?: string | null
  observaciones?: string | null
  created_at: string
  updated_at: string
  // Relaciones opcionales
  enfermero?: Pick<Enfermero, 'id' | 'nombre' | 'apellido' | 'telefono'> | null
  turno?: Pick<Turno, 'id' | 'fecha_inicio' | 'fecha_fin' | 'status'> | null
  caso?: Pick<Caso, 'id' | 'titulo'> | null
  paciente?: Pick<Paciente, 'id' | 'nombre' | 'apellido'> | null
  periodo?: Pick<PayrollPeriod, 'id' | 'nombre' | 'fecha_inicio' | 'fecha_fin' | 'estado' | 'fecha_programada_pago'> | null
}

export interface ResumenPagoEnfermero {
  enfermero_id: string
  enfermero_nombre: string
  enfermero_apellido: string
  total_turnos: number
  total_horas: number
  total_pagar: number
  items: PayrollItem[]
}

// ============================================================
// MÓDULO BITÁCORA — Trazabilidad de acciones
// ============================================================

export interface BitacoraEntry {
  id: string
  accion: string
  entidad: string
  entidad_id?: string | null
  descripcion?: string | null
  valores_previos?: Record<string, unknown> | null
  valores_nuevos?: Record<string, unknown> | null
  motivo?: string | null
  realizado_por?: string | null
  realizado_at: string
  metadata?: Record<string, unknown> | null
  // Relaciones opcionales
  usuario?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido' | 'rol'> | null
}

// ============================================================
// MÓDULO ALERTAS — Sistema de alertas internas
// ============================================================

export type TipoAlerta =
  | 'turno_sin_enfermero'
  | 'turno_sin_iniciar'
  | 'turno_sin_reporte'
  | 'turno_sin_entrega'
  | 'enfermero_no_confirmo'
  | 'reporte_pendiente'
  | 'incidencia_critica'
  | 'incidencia_grave'
  | 'medicamento_sin_existencia'
  | 'cuenta_por_cobrar_vencida'
  | 'pago_enfermero_proximo'
  | 'pago_vencido'
  | 'documento_por_vencer'
  | 'caso_margen_negativo'
  | 'propuesta_sin_respuesta'
  | 'paciente_sin_atencion'
  | 'corte_sin_autorizar'
  | 'turno_en_aclaracion'
  | 'otro'

export type GravedadAlerta = 'baja' | 'media' | 'alta' | 'critica'
export type EstadoAlerta = 'activa' | 'en_proceso' | 'resuelta' | 'ignorada'

export interface Alerta {
  id: string
  tipo: TipoAlerta
  gravedad: GravedadAlerta
  titulo: string
  descripcion?: string | null
  entidad?: string | null
  entidad_id?: string | null
  responsable_id?: string | null
  estado: EstadoAlerta
  accion_sugerida?: string | null
  url_accion?: string | null
  fecha_limite?: string | null
  resuelta_por?: string | null
  resuelta_at?: string | null
  dedup_key?: string | null
  created_at: string
  updated_at: string
  // Relaciones opcionales
  responsable?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'> | null
}

// ============================================================
// MÓDULO SALUD DEL SISTEMA — Chequeos de integridad
// ============================================================

export type GravedadProblema = 'critico' | 'alto' | 'medio' | 'bajo'

export interface ProblemaIntegridad {
  entidad: string
  entidad_id: string
  descripcion_entidad: string
  problema: string
  gravedad: GravedadProblema
  posible_solucion: string
  url_correccion: string
}

export interface ResumenSaludSistema {
  total_problemas: number
  criticos: number
  altos: number
  medios: number
  bajos: number
  problemas: ProblemaIntegridad[]
  generado_at: string
}

// ============================================================
// MÓDULO ORGANIZACIONAL — Fase 1
// ============================================================

export interface Organization {
  id: string
  nombre: string
  razon_social?: string | null
  rfc?: string | null
  logo_url?: string | null
  status: 'activo' | 'inactivo' | 'suspendido'
  plan: 'interno' | 'basico' | 'profesional' | 'enterprise'
  config: Record<string, unknown>
  created_at: string
}

export interface Portfolio {
  id: string
  organization_id: string
  nombre: string
  descripcion?: string | null
  responsable_id?: string | null
  status: 'activo' | 'inactivo'
  created_at: string
  // Relaciones opcionales
  organization?: Pick<Organization, 'id' | 'nombre'>
  responsable?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'>
}

// ============================================================
// TURNO EXTENDIDO — con campos de validación y nómina
// ============================================================

export interface TurnoConValidacion extends Turno {
  validacion_status: ValidacionStatusTurno
  horas_pagables?: number | null
  motivo_validacion?: string | null
  validado_por?: string | null
  validado_at?: string | null
  tarifa_costo_hora?: number | null
  // Relaciones opcionales
  validador?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'> | null
  reporte?: Pick<ReporteTurno, 'id' | 'created_at'> | null
  entrega?: Pick<EntregaTurno, 'id' | 'created_at'> | null
}

// ============================================================
// MÓDULO: MEMORIA OPERATIVA DEL CUIDADO
// ============================================================

export type CategoriaHallazgo =
  | 'integridad_piel'
  | 'respiratorio'
  | 'neurologico'
  | 'digestivo'
  | 'dolor'
  | 'movilidad'
  | 'nutricional'
  | 'otro'

export type SeveridadHallazgo = 'leve' | 'moderada' | 'grave'
export type EstadoHallazgo = 'abierto' | 'en_seguimiento' | 'resuelto'

export interface HallazgoClinico {
  id: string
  caso_id: string
  turno_id?: string | null
  enfermero_id?: string | null
  creado_por?: string | null

  categoria: CategoriaHallazgo
  tipo: string
  descripcion: string
  severidad: SeveridadHallazgo
  estado: EstadoHallazgo

  requiere_vigilancia: boolean
  requiere_notificacion: boolean
  fotos_urls: string[]

  fecha_resolucion?: string | null
  notas_resolucion?: string | null
  resuelto_por?: string | null

  created_at: string
  updated_at: string
  // Relaciones opcionales
  turno?: Pick<Turno, 'id' | 'fecha_inicio'>
  creador?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'>
}

export type PrioridadPendiente = 'urgente' | 'alta' | 'normal' | 'baja'
export type EstadoPendiente = 'pendiente' | 'en_proceso' | 'resuelto' | 'cancelado'
export type OrigenPendiente = 'manual' | 'hallazgo' | 'medicamento_omitido' | 'entrega_turno' | 'alerta' | 'automatico'

export interface PendienteCaso {
  id: string
  caso_id: string
  turno_origen_id?: string | null
  enfermero_creador_id?: string | null

  titulo: string
  descripcion?: string | null
  prioridad: PrioridadPendiente
  estado: EstadoPendiente

  origen: OrigenPendiente
  origen_id?: string | null

  turno_resolucion_id?: string | null
  enfermero_resolucion_id?: string | null
  fecha_resolucion?: string | null
  notas_resolucion?: string | null

  created_at: string
  updated_at: string
  // Relaciones opcionales
  turno_origen?: Pick<Turno, 'id' | 'fecha_inicio'>
  creador?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'>
}

export type TipoAlertaActiva =
  | 'riesgo_caida'
  | 'riesgo_lesion_cutanea'
  | 'riesgo_broncoaspiracion'
  | 'riesgo_deshidratacion'
  | 'riesgo_sepsis'
  | 'dolor_no_controlado'
  | 'otro'

export type NivelAlertaActiva = 'bajo' | 'moderado' | 'alto' | 'critico'

export interface AlertaActiva {
  id: string
  caso_id: string
  turno_activacion_id?: string | null
  activado_por?: string | null

  tipo: TipoAlertaActiva
  descripcion?: string | null
  nivel: NivelAlertaActiva
  activa: boolean

  turno_desactivacion_id?: string | null
  desactivado_por?: string | null
  fecha_desactivacion?: string | null
  motivo_desactivacion?: string | null

  created_at: string
  // Relaciones opcionales
  activador?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'>
}

export type ParametroVigilancia =
  | 'saturacion'
  | 'integridad_piel'
  | 'hidratacion'
  | 'evacuaciones'
  | 'presion_arterial'
  | 'glucosa'
  | 'dolor'
  | 'frecuencia_cardiaca'
  | 'temperatura'
  | 'peso'
  | 'otro'

export type FrecuenciaVigilancia =
  | 'continua'
  | 'cada_hora'
  | 'cada_2_horas'
  | 'cada_4_horas'
  | 'cada_turno'
  | 'cada_12_horas'
  | 'diario'
  | 'segun_necesidad'

export interface VigilanciaEspecial {
  id: string
  caso_id: string
  creado_por?: string | null

  parametro: ParametroVigilancia
  descripcion?: string | null
  frecuencia?: FrecuenciaVigilancia | null
  instrucciones?: string | null
  activa: boolean

  desactivado_por?: string | null
  fecha_desactivacion?: string | null

  created_at: string
  // Relaciones opcionales
  creador?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'>
}

export type EstadoPacienteEntrega = 'mejor' | 'igual' | 'peor'

export interface EntregaTurnoGuiada {
  id: string
  turno_id: string
  caso_id: string
  enfermero_saliente_id?: string | null

  estado_paciente: EstadoPacienteEntrega
  cambios_relevantes?: string | null
  pendientes_siguiente?: string | null
  vigilancia_especial?: string | null
  notificar_coordinacion: boolean
  notas_coordinacion?: string | null

  resumen_turno?: string | null
  resumen_familiar?: string | null

  created_at: string
  // Relaciones opcionales
  enfermero_saliente?: Pick<PerfilUsuario, 'id' | 'nombre' | 'apellido'>
}

export type TipoEventoTimeline =
  | 'hallazgo'
  | 'incidencia'
  | 'pendiente'
  | 'alerta'
  | 'reporte_turno'
  | 'entrega_turno'

export interface EventoTimeline {
  caso_id: string
  created_at: string
  tipo_evento: TipoEventoTimeline
  origen_id: string
  subtipo: string
  texto: string
  nivel: string
  estado: string
}

// ============================================================
// CENTRO PROFESIONAL ABASTEMED
// Sistema de niveles, competencias y capacitaciones
// ============================================================

export interface NivelProfesional {
  id: number
  nombre: string
  orden: number
  descripcion?: string | null
  horas_minimas: number
  guardias_minimas: number
  evaluacion_minima: number
  competencias_minimas: number
  incidencias_criticas_max: number
  requiere_validacion: boolean
  color: string
  created_at: string
}

export type EstadoCompetencia =
  | 'no_iniciado'
  | 'capacitacion_vista'
  | 'evaluacion_aprobada'
  | 'practica_observada'
  | 'validado'

export interface Competencia {
  id: string
  nombre: string
  descripcion?: string | null
  categoria: string
  nivel_minimo: number
  tipos_paciente: string[]
  activa: boolean
  orden: number
  created_at: string
}

export interface EnfermeroCompetencia {
  id: string
  enfermero_id: string
  competencia_id: string
  estado: EstadoCompetencia
  modulo_completado_at?: string | null
  evaluacion_score?: number | null
  practica_observada_at?: string | null
  validado_por?: string | null
  validado_at?: string | null
  notas?: string | null
  created_at: string
  updated_at: string
  competencia?: Competencia
}

export type EstadoModuloCapacitacion =
  | 'no_iniciado'
  | 'en_progreso'
  | 'completado'
  | 'aprobado'

export interface ContenidoModulo {
  tipo: 'intro' | 'seccion' | 'punto_clave' | 'alerta' | 'frase_cultura' | 'imagen' | 'video'
  titulo?: string
  texto?: string
  contenido?: string
  url?: string
}

export interface PreguntaEvaluacion {
  pregunta: string
  opciones: string[]
  respuesta_correcta: number
}

export interface ModuloCapacitacion {
  id: string
  titulo: string
  descripcion?: string | null
  duracion_minutos: number
  contenido: ContenidoModulo[]
  checklist: string[]
  evaluacion: PreguntaEvaluacion[]
  competencia_id?: string | null
  nivel_requerido: number
  orden: number
  obligatorio: boolean
  activo: boolean
  created_at: string
  competencia?: Competencia | null
}

export interface ProgresoCapacitacion {
  id: string
  enfermero_id: string
  modulo_id: string
  estado: EstadoModuloCapacitacion
  progreso_pct: number
  score?: number | null
  intentos: number
  iniciado_at?: string | null
  completado_at?: string | null
  aprobado_at?: string | null
  created_at: string
  updated_at: string
  modulo?: ModuloCapacitacion
}

export interface ManualOperativoPaciente {
  id: string
  paciente_id: string
  resumen?: string | null
  diagnosticos_relevantes: string[]
  riesgos_principales: string[]
  que_observar: string[]
  que_reportar: string[]
  que_evitar: string[]
  indicaciones_familia?: string | null
  indicaciones_medicas?: string | null
  observaciones_trato?: string | null
  activo: boolean
  actualizado_por?: string | null
  created_at: string
  updated_at: string
}

export interface EstadisticasProfesionales {
  guardias_completadas: number
  horas_acumuladas: number
  promedio_rating: number
  reportes_completados: number
  incidencias_criticas: number
  competencias_verificadas: number
  capacitaciones_aprobadas: number
}

export interface CentroProfesionalData {
  enfermero: Enfermero
  nivel_actual: NivelProfesional
  siguiente_nivel: NivelProfesional | null
  progreso_nivel_pct: number
  estadisticas: EstadisticasProfesionales
  proxima_guardia: (Turno & { caso?: Caso & { paciente?: Pick<Paciente, 'id' | 'nombre' | 'apellido'> } }) | null
  guardia_activa: (Turno & { caso?: Caso & { paciente?: Pick<Paciente, 'id' | 'nombre' | 'apellido'> } }) | null
  modulos_obligatorios_pendientes: ModuloCapacitacion[]
  modulos_sugeridos: (ModuloCapacitacion & { progreso?: ProgresoCapacitacion | null })[]
  mensaje_cultural: string
}
