import { getPacientes } from '@/lib/actions/pacientes'
import { InvitarFamiliarForm } from '@/components/admin/familiares/InvitarFamiliarForm'
import type { Paciente } from '@/types'

export default async function InvitarFamiliarPage() {
  let pacientes: Paciente[] = []
  try { pacientes = await getPacientes() } catch { /* sin datos */ }

  return <InvitarFamiliarForm pacientes={pacientes} />
}
