import { describe, it, expect } from 'vitest'
import { calcularPAM } from '../pam'

describe('calcularPAM', () => {
  it('calcula presión de pulso 30 y PAM 30 para una TA de 50/20 (caso central del módulo)', () => {
    const resultado = calcularPAM(50, 20)
    expect('error' in resultado).toBe(false)
    if (!('error' in resultado)) {
      expect(resultado.presionPulso).toBe(30)
      expect(resultado.pam).toBe(30)
    }
  })

  it('calcula la PAM aproximada para una TA habitual de 120/80', () => {
    const resultado = calcularPAM(120, 80)
    expect('error' in resultado).toBe(false)
    if (!('error' in resultado)) {
      expect(resultado.presionPulso).toBe(40)
      expect(resultado.pam).toBeCloseTo(93.3, 1)
    }
  })

  it('rechaza valores negativos', () => {
    expect(calcularPAM(-50, 20)).toHaveProperty('error')
    expect(calcularPAM(50, -20)).toHaveProperty('error')
  })

  it('rechaza cuando la diastólica es mayor o igual a la sistólica', () => {
    expect(calcularPAM(80, 80)).toHaveProperty('error')
    expect(calcularPAM(60, 80)).toHaveProperty('error')
  })

  it('rechaza valores fuera de rangos clínicamente razonables', () => {
    expect(calcularPAM(400, 20)).toHaveProperty('error')
    expect(calcularPAM(120, 250)).toHaveProperty('error')
  })

  it('rechaza valores no numéricos', () => {
    expect(calcularPAM(NaN, 20)).toHaveProperty('error')
    expect(calcularPAM(120, NaN)).toHaveProperty('error')
  })

  it('incluye una interpretación educativa sin diagnosticar', () => {
    const resultado = calcularPAM(50, 20)
    if (!('error' in resultado)) {
      expect(resultado.interpretacion.length).toBeGreaterThan(0)
    }
  })
})
