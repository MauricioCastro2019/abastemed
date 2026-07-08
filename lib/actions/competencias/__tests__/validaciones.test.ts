import { describe, it, expect } from 'vitest'
import {
  OtorgarCompetenciaManualSchema,
  RevocarCompetenciaSchema,
  PublicarCompetenciaSchema,
} from '@/lib/validations'

describe('OtorgarCompetenciaManualSchema', () => {
  const base = {
    enfermero_id: '11111111-1111-4111-8111-111111111111',
    competencia_id: '22222222-2222-4222-8222-222222222222',
  }

  it('falla sin justificación', () => {
    const resultado = OtorgarCompetenciaManualSchema.safeParse({ ...base, justificacion: '' })
    expect(resultado.success).toBe(false)
  })

  it('falla con justificación menor a 10 caracteres', () => {
    const resultado = OtorgarCompetenciaManualSchema.safeParse({ ...base, justificacion: 'muy corta' })
    expect(resultado.success).toBe(false)
  })

  it('pasa con justificación suficiente', () => {
    const resultado = OtorgarCompetenciaManualSchema.safeParse({
      ...base,
      justificacion: 'Certificación externa vigente presentada y verificada por coordinación clínica.',
    })
    expect(resultado.success).toBe(true)
  })
})

describe('RevocarCompetenciaSchema', () => {
  it('falla sin motivo', () => {
    const resultado = RevocarCompetenciaSchema.safeParse({ motivo: '' })
    expect(resultado.success).toBe(false)
  })

  it('falla con motivo demasiado corto', () => {
    const resultado = RevocarCompetenciaSchema.safeParse({ motivo: 'no aplica' })
    expect(resultado.success).toBe(false)
  })

  it('pasa con motivo suficiente', () => {
    const resultado = RevocarCompetenciaSchema.safeParse({
      motivo: 'Incidente reportado durante procedimiento supervisado, requiere re-entrenamiento.',
    })
    expect(resultado.success).toBe(true)
  })
})

describe('PublicarCompetenciaSchema', () => {
  const completo = {
    firmada_por: 'Dra. Ana López',
    cedula_responsable: '1234567',
    fecha_firma: '2026-07-08',
  }

  it('falla si falta firmada_por', () => {
    const resultado = PublicarCompetenciaSchema.safeParse({ ...completo, firmada_por: '' })
    expect(resultado.success).toBe(false)
  })

  it('falla si falta cedula_responsable', () => {
    const resultado = PublicarCompetenciaSchema.safeParse({ ...completo, cedula_responsable: '' })
    expect(resultado.success).toBe(false)
  })

  it('falla si falta fecha_firma', () => {
    const resultado = PublicarCompetenciaSchema.safeParse({ ...completo, fecha_firma: '' })
    expect(resultado.success).toBe(false)
  })

  it('pasa con todos los campos de firma presentes', () => {
    const resultado = PublicarCompetenciaSchema.safeParse(completo)
    expect(resultado.success).toBe(true)
  })
})
