import type { Metadata } from 'next'
import LandingNav from '@/components/landing/LandingNav'
import LandingHero from '@/components/landing/LandingHero'
import LandingServicios from '@/components/landing/LandingServicios'
import LandingComoFunciona from '@/components/landing/LandingComoFunciona'
import LandingPorQue from '@/components/landing/LandingPorQue'
import LandingTestimonios from '@/components/landing/LandingTestimonios'
import LandingCTA from '@/components/landing/LandingCTA'
import LandingFooter from '@/components/landing/LandingFooter'
import WhatsAppFloat from '@/components/landing/WhatsAppFloat'

export const metadata: Metadata = {
  title: 'Enfermeras a Domicilio en León, Guanajuato | Abastemed',
  description:
    'Tu tranquilidad, nuestra prioridad. Servicio profesional de enfermería a domicilio en León, Gto. Cuidado de adultos mayores, atención postoperatoria y más. Enfermeras certificadas disponibles 24/7. Llama al 479 138 53 08.',
  keywords: [
    'enfermera a domicilio León Guanajuato',
    'enfermería domiciliaria León',
    'cuidado adulto mayor León Gto',
    'enfermera post-quirúrgica León',
    'agencia enfermería León Guanajuato',
    'servicio enfermería domicilio Guanajuato',
  ],
  openGraph: {
    title: 'Enfermeras a Domicilio en León, Guanajuato | Abastemed',
    description:
      'Cuidado profesional de enfermería a domicilio en León, Gto. Disponibles 24/7. Enfermeras certificadas y verificadas.',
    locale: 'es_MX',
    type: 'website',
  },
}

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <LandingHero />
        <LandingServicios />
        <LandingComoFunciona />
        <LandingPorQue />
        <LandingTestimonios />
        <LandingCTA />
      </main>
      <LandingFooter />
      <WhatsAppFloat />
    </>
  )
}
