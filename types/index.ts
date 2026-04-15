// ============================================================
// ABASTEMED — Tipos base del sistema
// ============================================================

export type ContextoPaciente = 'domicilio' | 'hospital' | 'casa_reposo'
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
