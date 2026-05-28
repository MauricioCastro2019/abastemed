import { requireAuth } from '@/lib/actions/utils'
import { InsumosClient } from '@/components/admin/insumos/InsumosClient'

export default async function InsumosPage() {
  const { perfil } = await requireAuth()
  return <InsumosClient rol={perfil.rol} />
}
