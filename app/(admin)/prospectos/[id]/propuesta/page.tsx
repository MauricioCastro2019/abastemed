import { getCareQuote, getGeneratedDocuments } from '@/lib/actions/cotizacion'
import { PropuestaPageClient } from '@/components/admin/prospectos/PropuestaPageClient'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function PropuestaPage({ params }: { params: { id: string } }) {
  const { id } = params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') redirect(`/prospectos/${id}`)
  const [documents, quote] = await Promise.all([
    getGeneratedDocuments(id),
    getCareQuote(id),
  ])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/prospectos/${id}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B4B' }}>Propuesta y documentos</h1>
          <p className="text-sm text-gray-500 mt-1">Genera y envía documentos al cliente</p>
        </div>
      </div>

      <PropuestaPageClient
        prospectId={id}
        quote={quote}
        initialDocs={documents}
      />
    </div>
  )
}
