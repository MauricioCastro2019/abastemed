import { z } from 'zod'

export const PacienteSchema = z.object({
  nombre:            z.string().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  apellido:          z.string().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  fecha_nacimiento:  z.string().min(1, 'Fecha de nacimiento requerida'),
  diagnostico:       z.string().min(5, 'Describe brevemente el diagnóstico'),
  contexto:          z.enum(['domicilio', 'hospital', 'casa_reposo'], { message: 'Contexto inválido' }),
  contacto_nombre:   z.string().min(2, 'Nombre del familiar requerido'),
  contacto_telefono: z.string().min(7, 'Teléfono requerido'),
  contacto_relacion: z.string().min(2, 'Relación requerida'),
  contacto_email:    z.union([z.string().email('Email inválido'), z.literal('')]).optional(),
})

export const EnfermeroSchema = z.object({
  nombre:   z.string().min(2, 'Mínimo 2 caracteres').max(80),
  apellido: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  cedula:   z.string().min(6, 'Cédula inválida').max(20),
  telefono: z.string().min(7, 'Teléfono requerido'),
  email:    z.string().email('Email inválido'),
})

export const CasoSchema = z.object({
  paciente_id:  z.string().uuid('Selecciona un paciente válido'),
  titulo:       z.string().min(3, 'El título es muy corto').max(120, 'Máximo 120 caracteres'),
  contexto:     z.enum(['domicilio', 'hospital', 'casa_reposo'], { message: 'Contexto inválido' }),
  direccion:    z.string().min(5, 'Dirección requerida'),
  fecha_inicio: z.string().min(1, 'Fecha de inicio requerida'),
  tarifa_hora:  z.number().min(0, 'La tarifa no puede ser negativa'),
})

export const IndicacionSchema = z.object({
  paciente_id:  z.string().uuid('Paciente requerido'),
  caso_id:      z.string().uuid().optional().or(z.literal('')),
  tipo:         z.enum(
    ['medicamento_oral', 'aplicacion_medicamento', 'curacion', 'signos_vitales', 'terapia', 'otra'],
    { message: 'Tipo de indicación inválido' }
  ),
  nombre:       z.string().min(2, 'Nombre requerido').max(120, 'Máximo 120 caracteres'),
  dosis:        z.string().max(80).optional().or(z.literal('')),
  via:          z.enum(
    ['oral', 'intravenosa', 'intramuscular', 'subcutanea', 'topica', 'inhalatoria', 'sublingual', 'nasal', 'otra']
  ).optional().or(z.literal('')),
  frecuencia:   z.enum(
    ['cada_4h', 'cada_6h', 'cada_8h', 'cada_12h', 'cada_24h', 'lunes_miercoles_viernes', 'una_vez', 'segun_necesidad'],
    { message: 'Frecuencia inválida' }
  ),
  fecha_inicio: z.string().min(1, 'Fecha de inicio requerida'),
  fecha_fin:    z.string().optional().or(z.literal('')),
  responsable:  z.string().max(100).optional().or(z.literal('')),
  notas:        z.string().max(500).optional().or(z.literal('')),
})

export const LevantamientoSchema = z.object({
  paciente_nombre:           z.string().min(2, 'Nombre del paciente requerido'),
  paciente_apellido:         z.string().min(2, 'Apellido del paciente requerido'),
  responsable_nombre:        z.string().optional().or(z.literal('')),
  responsable_tel_principal: z.string().optional().or(z.literal('')),
  tipos_servicio:            z.array(z.string()).min(1, 'Selecciona al menos un tipo de servicio'),
  fecha_inicio_estimada:     z.string().optional().or(z.literal('')),
  riesgo_final:              z.enum(['bajo', 'medio', 'alto'], { message: 'Riesgo inválido' }),
  prioridad:                 z.enum(['baja', 'media', 'alta', 'urgente'], { message: 'Prioridad inválida' }),
  estado:                    z.enum(['borrador', 'pendiente_revision', 'revisado', 'aprobado', 'convertido', 'cancelado']).default('borrador'),
})

export const LevantamientoAprobacionSchema = LevantamientoSchema.extend({
  paciente_nombre:           z.string().min(2, 'Nombre del paciente requerido'),
  paciente_apellido:         z.string().min(2, 'Apellido requerido'),
  responsable_tel_principal: z.string().min(7, 'Teléfono del responsable requerido'),
  responsable_nombre:        z.string().min(2, 'Nombre del responsable requerido'),
  tipos_servicio:            z.array(z.string()).min(1, 'Servicio requerido'),
  actividades_enfermeria:    z.array(z.string()).min(1, 'Actividades requeridas'),
  fecha_inicio_estimada:     z.string().min(1, 'Fecha de inicio requerida'),
  riesgo_final:              z.enum(['bajo', 'medio', 'alto']),
  prioridad:                 z.enum(['baja', 'media', 'alta', 'urgente']),
})

export const TurnoSchema = z.object({
  caso_id:       z.string().uuid('Selecciona un caso válido'),
  enfermero_id:  z.string().uuid('Selecciona un enfermero válido'),
  fecha_inicio:  z.string().min(1, 'Fecha de inicio requerida'),
  fecha_fin:     z.string().min(1, 'Fecha de fin requerida'),
}).refine(
  d => !d.fecha_inicio || !d.fecha_fin || new Date(d.fecha_fin) > new Date(d.fecha_inicio),
  { message: 'La fecha de fin debe ser posterior a la de inicio', path: ['fecha_fin'] }
)
