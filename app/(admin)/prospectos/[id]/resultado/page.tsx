import {
  getAssessmentResult,
  getPreassessment,
  getPhysicalAssessment,
  getClinicalAssessment,
  getOperationalAssessment,
} from '@/lib/actions/evaluaciones'
import { ResultadoPageClient } from '@/components/admin/prospectos/ResultadoPageClient'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ResultadoPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [preassessment, existingResult] = await Promise.all([
    getPreassessment(id),
    getAssessmentResult(id),
  ])

  let canCalculate = false
  const missingItems: string[] = []

  if (preassessment) {
    const [pa, ca, oa] = await Promise.all([
      getPhysicalAssessment(preassessment.id),
      getClinicalAssessment(preassessment.id),
      getOperationalAssessment(preassessment.id),
    ])
    canCalculate = !!pa && !!ca && !!oa
    if (!pa) missingItems.push('Evaluación física')
    if (!ca) missingItems.push('Evaluación clínica')
    if (!oa) missingItems.push('Evaluación operativa')
  } else {
    missingItems.push('Pre-levantamiento del paciente')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/prospectos/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Resultado de evaluación</h1>
          <p className="text-sm text-gray-500 mt-1">Paso 7 de 8 — Motor de score</p>
        </div>
      </div>

      <ResultadoPageClient
        prospectId={id}
        preassessmentId={preassessment?.id ?? null}
        existingResult={existingResult}
        canCalculate={canCalculate}
        missingItems={missingItems}
      />
    </div>
  )
}
