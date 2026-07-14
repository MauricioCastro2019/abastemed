import { z } from 'zod'

export const PacienteSchema = z.object({
  nombre:            z.string().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  apellido:          z.string().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  fecha_nacimiento:  z.string().min(1, 'Fecha de nacimiento requerida'),
  diagnostico:       z.string().min(5, 'Describe brevemente el diagnóstico'),
  contexto:          z.enum(['domicilio', 'hospital', 'casa_reposo'], { message: 'Contexto inválido' }),
  tipo_sanguineo:    z.union([z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']), z.literal('')]).optional(),
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
  paciente_id:   z.string().uuid('Selecciona un paciente válido'),
  titulo:        z.string().min(3, 'El título es muy corto').max(120, 'Máximo 120 caracteres'),
  contexto:      z.enum(['domicilio', 'hospital', 'casa_reposo'], { message: 'Contexto inválido' }),
  direccion:     z.string().min(5, 'Dirección requerida'),
  fecha_inicio:  z.string().min(1, 'Fecha de inicio requerida'),
  costo_guardia: z.number().min(0, 'El costo no puede ser negativo'),
  horas_turno:   z.number().int().min(1, 'Mínimo 1 hora').max(24, 'Máximo 24 horas'),
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

// ============================================================
// MÓDULO FINANCIERO
// ============================================================

export const IngresoSchema = z.object({
  fecha_pago:                z.string().min(1, 'Fecha de pago requerida'),
  paciente_id:               z.string().uuid().optional().or(z.literal('')),
  caso_id:                   z.string().uuid().optional().or(z.literal('')),
  responsable_pago_nombre:   z.string().min(2, 'Nombre del responsable requerido').max(120),
  responsable_pago_contacto: z.string().max(80).optional().or(z.literal('')),
  concepto:                  z.string().min(3, 'Concepto requerido (mín. 3 caracteres)').max(200),
  tipo_ingreso:              z.enum([
    'anticipo','pago_servicio','pago_semanal','pago_mensual','pago_parcial',
    'regularizacion_adeudo','reembolso','otro_ingreso',
  ], { message: 'Tipo de ingreso inválido' }),
  periodo_cubierto_inicio:   z.string().optional().or(z.literal('')),
  periodo_cubierto_fin:      z.string().optional().or(z.literal('')),
  fecha_limite_pago:         z.string().optional().or(z.literal('')),
  monto_total:               z.number().min(0.01, 'El monto total debe ser mayor a 0'),
  monto_recibido:            z.number().min(0, 'El monto recibido no puede ser negativo'),
  metodo_pago:               z.enum(['efectivo','transferencia','tarjeta','deposito','otro'], { message: 'Método de pago inválido' }),
  cuenta_receptora:          z.string().max(100).optional().or(z.literal('')),
  referencia_pago:           z.string().max(100).optional().or(z.literal('')),
  observaciones:             z.string().max(500).optional().or(z.literal('')),
}).refine(
  d => d.monto_recibido <= d.monto_total,
  { message: 'El monto recibido no puede superar el monto total', path: ['monto_recibido'] }
)

export const SalidaSchema = z.object({
  fecha_salida:          z.string().min(1, 'Fecha de salida requerida'),
  tipo_salida:           z.enum([
    'pago_enfermero','pago_jefe_enfermeria','pago_coordinador','insumos_medicos',
    'medicamentos','traslado','viaticos','comida','comision','publicidad',
    'papeleria','equipo_medico','uniformes','plataforma_software','reembolso','otro_gasto',
  ], { message: 'Tipo de salida inválido' }),
  beneficiario_nombre:   z.string().min(2, 'Nombre del beneficiario requerido').max(120),
  beneficiario_contacto: z.string().max(80).optional().or(z.literal('')),
  enfermero_id:          z.string().uuid().optional().or(z.literal('')),
  paciente_id:           z.string().uuid().optional().or(z.literal('')),
  caso_id:               z.string().uuid().optional().or(z.literal('')),
  concepto:              z.string().min(3, 'Concepto requerido (mín. 3 caracteres)').max(200),
  monto:                 z.number().min(0.01, 'El monto debe ser mayor a 0'),
  metodo_pago:           z.enum(['efectivo','transferencia','tarjeta','deposito','otro'], { message: 'Método de pago inválido' }),
  cuenta_origen:         z.string().max(100).optional().or(z.literal('')),
  referencia_pago:       z.string().max(100).optional().or(z.literal('')),
  estatus:               z.enum(['pendiente','pagado','por_comprobar','en_revision']).optional(),
  observaciones:         z.string().max(500).optional().or(z.literal('')),
})

// ============================================================
// MÓDULO: COMPETENCIAS ESPECIALIZADAS
// ============================================================

export const CompetenciaSchema = z.object({
  nombre:            z.string().min(3, 'Mínimo 3 caracteres').max(150, 'Máximo 150 caracteres'),
  descripcion:       z.string().max(500).optional().or(z.literal('')),
  categoria:         z.string().min(2, 'Categoría requerida').max(60),
  codigo:            z.string().regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guion bajo').max(80).optional().or(z.literal('')),
  vigencia_meses:    z.union([z.number().int().min(1, 'Mínimo 1 mes'), z.null()]).optional(),
  requiere_validacion_practica: z.boolean().optional(),
  notas:             z.string().max(500).optional().or(z.literal('')),
})

export const PublicarCompetenciaSchema = z.object({
  firmada_por:        z.string().min(2, 'Nombre del responsable clínico requerido').max(150),
  cedula_responsable: z.string().min(3, 'Cédula profesional requerida').max(40),
  fecha_firma:        z.string().min(1, 'Fecha de firma requerida'),
})

export const OtorgarCompetenciaManualSchema = z.object({
  enfermero_id:   z.string().uuid('Selecciona un enfermero válido'),
  competencia_id: z.string().uuid('Selecciona una competencia válida'),
  justificacion:  z.string().min(10, 'La justificación debe tener al menos 10 caracteres').max(500),
  certificado_url: z.string().url('URL inválida').optional().or(z.literal('')),
  notas:          z.string().max(500).optional().or(z.literal('')),
})

export const RevocarCompetenciaSchema = z.object({
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(500),
})

export const PacienteCompetenciaRequeridaSchema = z.object({
  paciente_id:    z.string().uuid('Paciente requerido'),
  competencia_id: z.string().uuid('Selecciona una competencia válida'),
  notas:          z.string().max(500).optional().or(z.literal('')),
})
