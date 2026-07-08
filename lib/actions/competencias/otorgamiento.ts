// Lógica pura de otorgamiento de competencias. Es la única fuente
// de verdad sobre cuándo una competencia pasa a estar "otorgada"
// (fecha_otorgada/fecha_caducidad/version_otorgada), reutilizada
// por completarModulo() (curso), validarCompetenciaEnfermero()
// (validación práctica) y otorgarCompetenciaManual() (manual).
//
// Sin I/O — testeable sin mocks de Supabase.

export type EstadoAlcanzado = 'capacitacion_vista' | 'evaluacion_aprobada' | 'practica_observada' | 'validado'

export interface CompetenciaOtorgamientoInput {
  requiereValidacionPractica: boolean
  vigenciaMeses: number | null
  version: number
}

export interface OtorgamientoResult {
  yaEsTerminal: boolean
  fechaOtorgada: string | null
  fechaCaducidad: string | null
  versionOtorgada: number | null
}

function sumarMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha)
  resultado.setMonth(resultado.getMonth() + meses)
  return resultado
}

export function calcularOtorgamiento(
  input: CompetenciaOtorgamientoInput,
  estadoAlcanzado: EstadoAlcanzado,
  ahora: Date = new Date()
): OtorgamientoResult {
  const estadoTerminal: EstadoAlcanzado = input.requiereValidacionPractica ? 'validado' : 'evaluacion_aprobada'
  const yaEsTerminal = estadoAlcanzado === estadoTerminal

  if (!yaEsTerminal) {
    return { yaEsTerminal: false, fechaOtorgada: null, fechaCaducidad: null, versionOtorgada: null }
  }

  const fechaOtorgada = ahora.toISOString()
  const fechaCaducidad = input.vigenciaMeses != null
    ? sumarMeses(ahora, input.vigenciaMeses).toISOString()
    : null

  return {
    yaEsTerminal: true,
    fechaOtorgada,
    fechaCaducidad,
    versionOtorgada: input.version,
  }
}

export function calcularAprobacion(score: number, minimo: number): boolean {
  return score >= minimo
}
