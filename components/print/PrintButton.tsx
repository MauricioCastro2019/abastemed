'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-5 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90 transition-all"
      style={{ backgroundColor: '#0B2A44' }}
    >
      Imprimir / Guardar PDF
    </button>
  )
}
