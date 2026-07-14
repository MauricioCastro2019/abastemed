// ============================================================
// Calculadora de presión arterial media (PAM) — herramienta
// educativa de la capacitación "Hipotensión arterial y actuación
// ante una TA crítica". Lógica pura, sin dependencias de framework.
//
// PAM aproximada = diastólica + 1/3 de (sistólica − diastólica)
// ============================================================

export interface ResultadoPAM {
  presionPulso: number
  pam: number
  interpretacion: string
}

export interface ErrorPAM {
  error: string
}

const SISTOLICA_MIN = 30
const SISTOLICA_MAX = 300
const DIASTOLICA_MIN = 0
const DIASTOLICA_MAX = 200

export function calcularPAM(sistolica: number, diastolica: number): ResultadoPAM | ErrorPAM {
  if (!Number.isFinite(sistolica) || !Number.isFinite(diastolica)) {
    return { error: 'Ingresa valores numéricos para ambas presiones.' }
  }

  if (sistolica < 0 || diastolica < 0) {
    return { error: 'La presión arterial no puede ser un valor negativo.' }
  }

  if (sistolica < SISTOLICA_MIN || sistolica > SISTOLICA_MAX) {
    return { error: `La sistólica debe estar entre ${SISTOLICA_MIN} y ${SISTOLICA_MAX} mmHg.` }
  }

  if (diastolica < DIASTOLICA_MIN || diastolica > DIASTOLICA_MAX) {
    return { error: `La diastólica debe estar entre ${DIASTOLICA_MIN} y ${DIASTOLICA_MAX} mmHg.` }
  }

  if (diastolica >= sistolica) {
    return { error: 'La diastólica debe ser menor que la sistólica.' }
  }

  const presionPulso = sistolica - diastolica
  const pam = Math.round((diastolica + presionPulso / 3) * 10) / 10

  return { presionPulso, pam, interpretacion: interpretarPAM(pam) }
}

function interpretarPAM(pam: number): string {
  if (pam < 60) {
    return 'Una PAM por debajo de 60 mmHg se considera extremadamente baja y puede ser insuficiente para mantener una perfusión adecuada de órganos vitales. Requiere valoración clínica inmediata.'
  }
  if (pam < 65) {
    return 'Una PAM cercana a 60–65 mmHg está en el límite habitualmente considerado necesario para mantener la perfusión de órganos vitales. Debe valorarse junto con el resto del cuadro clínico.'
  }
  if (pam <= 100) {
    return 'Esta PAM se ubica en un rango frecuente en adultos. No descarta por sí sola ningún problema: siempre debe interpretarse junto con el estado clínico del paciente.'
  }
  return 'Una PAM elevada requiere también valoración clínica; esta herramienta no evalúa hipertensión ni sus riesgos asociados.'
}
