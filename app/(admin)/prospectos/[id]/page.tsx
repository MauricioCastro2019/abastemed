import { getProspectoConRelaciones } from '@/lib/actions/prospectos'
import {
  getPreassessment,
  getPhysicalAssessment,
  getClinicalAssessment,
  getOperationalAssessment,
  getAssessmentResult,
  getServiceRequest,
} from '@/lib/actions/evaluaciones'
import { getCareQuote, getGeneratedDocuments, getActivationChecklist } from '@/lib/actions/cotizacion'
import { SemaforoBadge, ProspectoStatusBadge } from '@/components/admin/prospectos/SemaforoBadge'
import { ResultadoCard } from '@/components/admin/prospectos/ResultadoCard'
import { createClient } from '@/lib/supabase/server'
import {
  ArrowLeft, Phone, Mail, ChevronRight, CheckCircle,
  Users, FileText,
} from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ToastSuccess } from '@/components/ToastSuccess'
import type { RiskColor, ComplexityLevel } from '@/types'

interface StepConfig {
  id: string
  label: string
  href: (id: string) => string
  done: boolean
  optional?: boolean
}

export default async function ProspectoDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfilData } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  const esAdmin = perfilData?.rol === 'admin'

  let data: Awaited<ReturnType<typeof getProspectoConRelaciones>>
  try {
    data = await getProspectoConRelaciones(id)
  } catch {
    notFound()
  }

  const { prospect } = data

  const [preassessment, result, quote, documents, checklist, serviceRequest] = await Promise.all([
    getPreassessment(id),
    getAssessmentResult(id),
    esAdmin ? getCareQuote(id) : Promise.resolve(null),
    esAdmin ? getGeneratedDocuments(id) : Promise.resolve([]),
    esAdmin ? getActivationChecklist(id) : Promise.resolve(null),
    getServiceRequest(id),
  ])

  const physicalDone  = preassessment ? await getPhysicalAssessment(preassessment.id).then(Boolean) : false
  const clinicalDone  = preassessment ? await getClinicalAssessment(preassessment.id).then(Boolean) : false
  const operatDone    = preassessment ? await getOperationalAssessment(preassessment.id).then(Boolean) : false

  const STEPS_BASE: StepConfig[] = [
    { id: 'prelevantamiento', label: 'Pre-levantamiento del paciente', href: id => `/prospectos/${id}/prelevantamiento`, done: !!preassessment },
    { id: 'fisica',           label: 'Evaluación física',              href: id => `/prospectos/${id}/evaluacion-fisica`,    done: physicalDone },
    { id: 'clinica',          label: 'Evaluación clínica',             href: id => `/prospectos/${id}/evaluacion-clinica`,   done: clinicalDone },
    { id: 'operativa',        label: 'Evaluación operativa/familiar',  href: id => `/prospectos/${id}/evaluacion-operativa`, done: operatDone },
    { id: 'comercial',        label: 'Datos del servicio',             href: id => `/prospectos/${id}/datos-comerciales`,    done: !!serviceRequest },
    { id: 'resultado',        label: 'Resultado / Motor de score',     href: id => `/prospectos/${id}/resultado`,            done: !!result },
  ]

  const STEPS_ADMIN_EXTRA: StepConfig[] = [
    { id: 'cotizacion',       label: 'Cotización',                     href: id => `/prospectos/${id}/cotizacion`,           done: !!quote },
    { id: 'propuesta',        label: 'Propuesta',                      href: id => `/prospectos/${id}/propuesta`,            done: documents.length > 0 },
    { id: 'activacion',       label: 'Checklist de activación',        href: id => `/prospectos/${id}/activacion`,           done: !!checklist?.is_ready_to_activate },
  ]

  const STEPS: StepConfig[] = esAdmin ? [...STEPS_BASE, ...STEPS_ADMIN_EXTRA] : STEPS_BASE

  const relationship: Record<string, string> = {
    hijo_a: 'Hijo/a', esposo_a: 'Esposo/a', hermano_a: 'Hermano/a', nieto_a: 'Nieto/a',
    familiar: 'Familiar', tutor: 'Tutor', medico: 'Médico', trab_social: 'Trabajador social', otro: 'Otro',
  }

  return (
    <div className="space-y-6">
      <Suspense><ToastSuccess /></Suspense>

      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <Link href="/prospectos" className="text-gray-400 hover:text-gray-600 transition-colors mt-1">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>{prospect.requester_name}</h1>
            <ProspectoStatusBadge status={prospect.status} />
            {prospect.is_urgent && (
              <span className="px-2.5 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">URGENTE</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {relationship[prospect.relationship_to_patient] ?? prospect.relationship_to_patient}
            {preassessment && ` · Paciente: ${preassessment.patient_name}`}
          </p>
        </div>
        <Link href={`/prospectos/${id}/editar`}
          className="text-sm font-medium text-gray-500 hover:text-[#2AABBF] transition-colors">
          Editar
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Columna izquierda ─── */}
        <div className="lg:col-span-1 space-y-5">

          {/* Info del solicitante */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Solicitante</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone size={15} className="text-gray-400 flex-shrink-0" />
                <span>{prospect.requester_phone}</span>
              </div>
              {prospect.requester_whatsapp && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-400 text-base">💬</span>
                  <span>{prospect.requester_whatsapp}</span>
                </div>
              )}
              {prospect.requester_email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={15} className="text-gray-400 flex-shrink-0" />
                  <span className="break-all">{prospect.requester_email}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Users size={15} className="text-gray-400 flex-shrink-0" />
                <span>{relationship[prospect.relationship_to_patient] ?? prospect.relationship_to_patient}</span>
              </div>
            </div>

            {(!prospect.is_payer || !prospect.is_authorizer) && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {!prospect.is_authorizer && prospect.authorization_responsible_name && (
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Autoriza:</span> {prospect.authorization_responsible_name}
                  </p>
                )}
                {esAdmin && !prospect.is_payer && prospect.payment_responsible_name && (
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Paga:</span> {prospect.payment_responsible_name}
                    {prospect.payment_responsible_phone && ` · ${prospect.payment_responsible_phone}`}
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Medio: <span className="capitalize">{prospect.source?.replace(/_/g, ' ')}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Urgencia: <span className="capitalize">{prospect.urgency?.replace(/_/g, ' ')}</span>
              </p>
            </div>

            {prospect.initial_observations && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Observaciones</p>
                <p className="text-sm text-gray-600 leading-relaxed">{prospect.initial_observations}</p>
              </div>
            )}
          </div>

          {/* Semáforo */}
          {result && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Evaluación</h2>
              <SemaforoBadge
                color={result.risk_color as RiskColor}
                complexity={result.general_complexity_level as ComplexityLevel}
                score={result.total_score}
              />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Física', score: result.physical_score },
                  { label: 'Clínica', score: result.clinical_score },
                  { label: 'Operativa', score: result.operational_score },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className="text-base font-bold" style={{ color: '#1B2B4B' }}>{s.score}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cotización — solo administración */}
          {esAdmin && quote && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Cotización</h2>
              <p className="text-3xl font-bold" style={{ color: '#2AABBF' }}>
                ${Number(quote.final_price ?? quote.suggested_price).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-400 mt-1">por guardia · {serviceRequest?.shift_duration_hours ?? 8}h</p>
              <p className="text-xs text-gray-400 mt-1">
                Anticipo: ${Number(quote.deposit_required).toLocaleString('es-MX')}
              </p>
              <Link href={`/prospectos/${id}/cotizacion`}
                className="mt-3 text-xs text-[#2AABBF] hover:underline block">
                Ver detalle →
              </Link>
            </div>
          )}
        </div>

        {/* ─── Columna derecha ─── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Flujo de pasos */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Flujo de evaluación</h2>
            <div className="space-y-2">
              {STEPS.map((step, idx) => (
                <Link
                  key={step.id}
                  href={step.href(id)}
                  className="flex items-center gap-4 p-3.5 rounded-xl border border-gray-100 hover:border-[#2AABBF] hover:bg-[#EBF8FB] transition-all group">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${step.done ? 'bg-[#2AABBF]' : 'bg-gray-100'}`}>
                    {step.done
                      ? <CheckCircle size={16} className="text-white" />
                      : <span className="text-xs text-gray-400 font-medium">{idx + 1}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.done ? 'text-gray-700' : 'text-gray-500'}`}>
                      {step.label}
                    </p>
                    {step.done && (
                      <p className="text-xs text-[#2AABBF] mt-0.5">Completado · Ver o editar</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[#2AABBF] transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Resultado rápido si existe */}
          {result && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Resultado de evaluación</h2>
              <ResultadoCard result={result} />
            </div>
          )}

          {/* Propuestas generadas — solo administración */}
          {esAdmin && documents.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Documentos generados</h2>
              <div className="space-y-2">
                {documents.slice(0, 3).map(doc => (
                  <Link key={doc.id} href={`/prospectos/${id}/propuesta`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#2AABBF] transition-all group">
                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{doc.title}</p>
                      <p className="text-xs text-gray-400 capitalize">{doc.document_type.replace(/_/g, ' ')} · {doc.status}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#2AABBF]" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Checklist status — solo administración */}
          {esAdmin && checklist && (
            <div className={`rounded-xl shadow-sm p-5 border-2 ${checklist.is_ready_to_activate ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold ${checklist.is_ready_to_activate ? 'text-green-700' : 'text-amber-700'}`}>
                  {checklist.is_ready_to_activate ? '✓ Listo para activar como paciente' : '⚠ Checklist pendiente'}
                </p>
                <Link href={`/prospectos/${id}/activacion`}
                  className={`text-xs font-medium hover:underline ${checklist.is_ready_to_activate ? 'text-green-600' : 'text-amber-600'}`}>
                  Ver checklist →
                </Link>
              </div>
              {!checklist.is_ready_to_activate && checklist.missing_items.length > 0 && (
                <p className="text-xs text-amber-600 mt-2">Falta: {checklist.missing_items.slice(0, 2).join(', ')}{checklist.missing_items.length > 2 ? ` y ${checklist.missing_items.length - 2} más` : ''}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
