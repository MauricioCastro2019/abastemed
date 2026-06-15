// ─── Datos de contacto — actualiza estos valores ──────────────────────────────
export const CONTACT = {
  phone: '479 138 53 08',
  phoneHref: 'tel:+524791385308',
  wa: '524791385308',
  waMessage: 'Hola Abastemed, me interesa conocer sus servicios de enfermería a domicilio',
  email: 'contacto@abastemed.com',
  ciudad: 'León, Guanajuato',
}

export const WA_LINK = `https://wa.me/${CONTACT.wa}?text=${encodeURIComponent(CONTACT.waMessage)}`
