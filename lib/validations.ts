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

export const TurnoSchema = z.object({
  caso_id:       z.string().uuid('Selecciona un caso válido'),
  enfermero_id:  z.string().uuid('Selecciona un enfermero válido'),
  fecha_inicio:  z.string().min(1, 'Fecha de inicio requerida'),
  fecha_fin:     z.string().min(1, 'Fecha de fin requerida'),
}).refine(
  d => !d.fecha_inicio || !d.fecha_fin || new Date(d.fecha_fin) > new Date(d.fecha_inicio),
  { message: 'La fecha de fin debe ser posterior a la de inicio', path: ['fecha_fin'] }
)
