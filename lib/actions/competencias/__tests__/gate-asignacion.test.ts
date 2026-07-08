import { describe, it, expect } from 'vitest'
import { evaluarGateCompetencias, type CompetenciaOtorgada, type CompetenciaRequerida } from '../gate-asignacion'

const AHORA = new Date('2026-07-08T12:00:00Z')

const RENAL: CompetenciaRequerida = { id: 'comp-renal', nombre: 'Ruta Renal', modulo_id: 'mod-renal' }
const OSTOMIA: CompetenciaRequerida = { id: 'comp-ostomia', nombre: 'Ostomía', modulo_id: null }

function otorgada(overrides: Partial<CompetenciaOtorgada> = {}): CompetenciaOtorgada {
  return {
    competencia_id: 'comp-renal',
    fecha_otorgada: '2026-01-01T00:00:00Z',
    fecha_caducidad: null,
    estado_vigencia: 'vigente',
    ...overrides,
  }
}

describe('evaluarGateCompetencias', () => {
  it('rechaza cuando el enfermero no tiene ninguna competencia otorgada', () => {
    const resultado = evaluarGateCompetencias([RENAL], [], AHORA)
    expect(resultado.permitido).toBe(false)
    expect(resultado.faltantes).toEqual([RENAL])
  })

  it('rechaza cuando la competencia otorgada ya caducó', () => {
    const resultado = evaluarGateCompetencias(
      [RENAL],
      [otorgada({ fecha_caducidad: '2026-06-01T00:00:00Z' })],
      AHORA
    )
    expect(resultado.permitido).toBe(false)
    expect(resultado.faltantes).toEqual([RENAL])
  })

  it('rechaza cuando la competencia fue revocada aunque no haya caducado', () => {
    const resultado = evaluarGateCompetencias(
      [RENAL],
      [otorgada({ estado_vigencia: 'revocada', fecha_caducidad: '2027-01-01T00:00:00Z' })],
      AHORA
    )
    expect(resultado.permitido).toBe(false)
    expect(resultado.faltantes).toEqual([RENAL])
  })

  it('permite cuando la competencia está vigente sin fecha de caducidad', () => {
    const resultado = evaluarGateCompetencias([RENAL], [otorgada({ fecha_caducidad: null })], AHORA)
    expect(resultado.permitido).toBe(true)
    expect(resultado.faltantes).toEqual([])
  })

  it('permite cuando la fecha de caducidad es futura', () => {
    const resultado = evaluarGateCompetencias(
      [RENAL],
      [otorgada({ fecha_caducidad: '2027-01-01T00:00:00Z' })],
      AHORA
    )
    expect(resultado.permitido).toBe(true)
    expect(resultado.faltantes).toEqual([])
  })

  it('permite cuando el paciente no tiene requisitos', () => {
    const resultado = evaluarGateCompetencias([], [], AHORA)
    expect(resultado.permitido).toBe(true)
    expect(resultado.faltantes).toEqual([])
  })

  it('con múltiples requisitos, faltantes solo lista las que realmente faltan', () => {
    const resultado = evaluarGateCompetencias(
      [RENAL, OSTOMIA],
      [otorgada({ competencia_id: 'comp-renal', fecha_caducidad: null })],
      AHORA
    )
    expect(resultado.permitido).toBe(false)
    expect(resultado.faltantes).toEqual([OSTOMIA])
  })
})
