'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FileText, MessageSquare, Copy, Check } from 'lucide-react'
import { generarDocumento, marcarDocumentoEnviado, marcarDocumentoAceptado } from '@/lib/actions/cotizacion'
import type { GeneratedDocument, CareQuote } from '@/types'

const DOC_TYPES = [
  { type: 'whatsapp_corto',    label: 'Mensaje WhatsApp',      icon: MessageSquare, color: '#25D366' },
  { type: 'propuesta_formal',  label: 'Propuesta formal',      icon: FileText,      color: '#2AABBF' },
  { type: 'resumen_interno',   label: 'Resumen interno',       icon: FileText,      color: '#6b7280' },
  { type: 'seguimiento',       label: 'Mensaje de seguimiento',icon: MessageSquare, color: '#7c3aed' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  borrador: { label: 'Borrador',   color: '#6b7280' },
  enviado:  { label: 'Enviado',    color: '#2563eb' },
  aceptado: { label: 'Aceptado ✓', color: '#059669' },
}

interface Props {
  prospectId: string
  quote: CareQuote | null
  initialDocs: GeneratedDocument[]
}

export function PropuestaPageClient({ prospectId, quote, initialDocs }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [docs, setDocs] = useState(initialDocs)
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDocument | null>(initialDocs[0] ?? null)

  function handleGenerate(type: string) {
    if (!quote) { setError('Primero genera la cotización.'); return }
    setError('')
    startTransition(async () => {
      const res = await generarDocumento(prospectId, quote.id, type)
      if (res.error) { setError(res.error); return }
      router.refresh()
    })
  }

  function handleCopy(content: string, id: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  function handleMarkSent(docId: string) {
    startTransition(async () => {
      await marcarDocumentoEnviado(docId, prospectId)
      router.refresh()
    })
  }

  function handleMarkAccepted(docId: string) {
    startTransition(async () => {
      await marcarDocumentoAceptado(docId, prospectId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {!quote && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-amber-700 font-medium">Primero genera la cotización antes de crear documentos.</p>
          <Link href={`/prospectos/${prospectId}/cotizacion`} className="text-sm text-[#2AABBF] hover:underline mt-1 block">Ir a cotización →</Link>
        </div>
      )}

      {quote && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Generar documento</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DOC_TYPES.map(dt => {
              const Icon = dt.icon
              return (
                <button key={dt.type} onClick={() => handleGenerate(dt.type)} disabled={pending}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-[#2AABBF] hover:bg-[#EBF8FB] transition-all disabled:opacity-60">
                  <Icon size={24} style={{ color: dt.color }} />
                  <span className="text-xs font-medium text-gray-600 text-center">{dt.label}</span>
                </button>
              )
            })}
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>
      )}

      {docs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Documentos generados</h2>
            {docs.map(doc => {
              const st = STATUS_LABELS[doc.status] ?? STATUS_LABELS.borrador
              return (
                <button key={doc.id} onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${selectedDoc?.id === doc.id ? 'border-[#2AABBF] bg-[#EBF8FB]' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                  <p className="text-sm font-medium text-gray-800 truncate">{doc.title}</p>
                  <p className="text-xs mt-1" style={{ color: st.color }}>{st.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(doc.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </button>
              )
            })}
          </div>

          {selectedDoc && (
            <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{selectedDoc.title}</h3>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{selectedDoc.document_type.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleCopy(selectedDoc.content, selectedDoc.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                    {copied === selectedDoc.id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                    {copied === selectedDoc.id ? 'Copiado' : 'Copiar'}
                  </button>
                  {selectedDoc.status === 'borrador' && (
                    <button onClick={() => handleMarkSent(selectedDoc.id)} disabled={pending}
                      className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60"
                      style={{ backgroundColor: '#2563eb' }}>
                      Marcar enviado
                    </button>
                  )}
                  {selectedDoc.status === 'enviado' && (
                    <button onClick={() => handleMarkAccepted(selectedDoc.id)} disabled={pending}
                      className="px-3 py-1.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 disabled:opacity-60"
                      style={{ backgroundColor: '#059669' }}>
                      Marcar aceptado
                    </button>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{selectedDoc.content}</pre>
              </div>
              {selectedDoc.status === 'aceptado' && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-green-700">✓ Propuesta aceptada por el cliente</p>
                  <Link href={`/prospectos/${prospectId}/activacion`}
                    className="px-4 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90"
                    style={{ backgroundColor: '#059669' }}>
                    Ir al checklist de activación →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {docs.length === 0 && quote && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FileText size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">Selecciona un tipo de documento para generarlo.</p>
        </div>
      )}
    </div>
  )
}
