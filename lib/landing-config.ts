// ─── Datos de contacto — actualiza estos valores ──────────────────────────────
export const CONTACT = {
  phone: '479 105 4012',
  phoneHref: 'tel:+524791054012',
  wa: '524791054012',
  waMessage: 'Hola Abastemed, me interesa conocer sus servicios de enfermería a domicilio',
  email: 'contacto@abastemed.com',
  ciudad: 'León, Guanajuato',
}

export const WA_LINK = `https://wa.me/${CONTACT.wa}?text=${encodeURIComponent(CONTACT.waMessage)}`
