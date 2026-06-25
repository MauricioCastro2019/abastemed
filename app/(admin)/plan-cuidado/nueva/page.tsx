import { getPacientes } from '@/lib/actions/pacientes'
import NuevaIndicacionGlobalForm from './NuevaIndicacionGlobalForm'

export default async function NuevaIndicacionGlobalPage() {
  const pacientes = await getPacientes()

  const lista = pacientes
    .map(p => ({ id: p.id, nombre: p.nombre, apellido: p.apellido }))
    .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es'))

  return <NuevaIndicacionGlobalForm pacientes={lista} />
}
