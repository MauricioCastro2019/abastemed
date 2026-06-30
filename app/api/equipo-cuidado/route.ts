import { NextRequest, NextResponse } from 'next/server'
import { getEquipoCuidadoByCaso } from '@/lib/actions/equipo-cuidado'

export async function GET(req: NextRequest) {
  const casoId = req.nextUrl.searchParams.get('caso_id')
  if (!casoId) {
    return NextResponse.json({ error: 'caso_id requerido' }, { status: 400 })
  }

  try {
    const equipo = await getEquipoCuidadoByCaso(casoId)
    return NextResponse.json(equipo)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
