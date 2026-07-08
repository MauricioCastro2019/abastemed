import { describe, it, expect } from 'vitest'
import { calcularOtorgamiento, calcularAprobacion } from '../otorgamiento'

const AHORA = new Date('2026-07-08T12:00:00Z')

describe('calcularOtorgamiento', () => {
  it('otorga automáticamente al alcanzar evaluacion_aprobada cuando no requiere validación práctica', () => {
    const resultado = calcularOtorgamiento(
      { requiereValidacionPractica: false, vigenciaMeses: null, version: 1 },
      'evaluacion_aprobada',
      AHORA
    )
    expect(resultado.yaEsTerminal).toBe(true)
    expect(resultado.fechaOtorgada).toBe(AHORA.toISOString())
    expect(resultado.versionOtorgada).toBe(1)
  })

  it('NO otorga con evaluacion_aprobada cuando la competencia requiere validación práctica', () => {
    const resultado = calcularOtorgamiento(
      { requiereValidacionPractica: true, vigenciaMeses: null, version: 1 },
      'evaluacion_aprobada',
      AHORA
    )
    expect(resultado.yaEsTerminal).toBe(false)
    expect(resultado.fechaOtorgada).toBeNull()
    expect(resultado.fechaCaducidad).toBeNull()
    expect(resultado.versionOtorgada).toBeNull()
  })

  it('otorga al alcanzar validado cuando la competencia requiere validación práctica', () => {
    const resultado = calcularOtorgamiento(
      { requiereValidacionPractica: true, vigenciaMeses: null, version: 2 },
      'validado',
      AHORA
    )
    expect(resultado.yaEsTerminal).toBe(true)
    expect(resultado.fechaOtorgada).toBe(AHORA.toISOString())
    expect(resultado.versionOtorgada).toBe(2)
  })

  it('calcula fecha_caducidad como fecha_otorgada + vigencia_meses', () => {
    const resultado = calcularOtorgamiento(
      { requiereValidacionPractica: false, vigenciaMeses: 12, version: 1 },
      'evaluacion_aprobada',
      AHORA
    )
    expect(resultado.fechaCaducidad).toBe(new Date('2027-07-08T12:00:00Z').toISOString())
  })

  it('fecha_caducidad es null cuando vigencia_meses es null (competencia sin vencimiento)', () => {
    const resultado = calcularOtorgamiento(
      { requiereValidacionPractica: false, vigenciaMeses: null, version: 1 },
      'evaluacion_aprobada',
      AHORA
    )
    expect(resultado.fechaCaducidad).toBeNull()
  })
})

describe('calcularAprobacion', () => {
  it('aprueba cuando el score alcanza el umbral por defecto (70)', () => {
    expect(calcularAprobacion(70, 70)).toBe(true)
    expect(calcularAprobacion(69, 70)).toBe(false)
  })

  it('respeta un umbral más exigente (80, como Ruta Renal)', () => {
    expect(calcularAprobacion(80, 80)).toBe(true)
    expect(calcularAprobacion(75, 80)).toBe(false)
  })
})
