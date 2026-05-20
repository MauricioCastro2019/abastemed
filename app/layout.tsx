import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: {
    default: 'Abastemed — Enfermería a Domicilio en León, Gto.',
    template: '%s | Abastemed',
  },
  description:
    'Agencia de enfermería profesional a domicilio en León, Guanajuato. Cuidado de adultos mayores y pacientes post-quirúrgicos. Disponibles 24/7.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
