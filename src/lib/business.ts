// Datos de ejemplo del negocio (ver README).
export const BUSINESS = {
  name: "Taller de Costura Marta",
  whatsapp: "5491155550123",
  address: "Av. Díaz Vélez 4321, Almagro, CABA",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Av. Díaz Vélez 4321, Almagro, Buenos Aires"),
  instagram: "https://instagram.com/tallerdecosturamarta",
  facebook: "https://facebook.com/tallerdecosturamarta",
};

export function whatsappSummaryUrl(p: { name: string; service: string; day: string; time: string; code: string }) {
  const text = `¡Hola! Soy ${p.name}. Reservé un turno en ${BUSINESS.name}:\n` +
    `• Arreglo: ${p.service}\n• Día: ${p.day}\n• Hora: ${p.time} hs\n• Código de reserva: ${p.code}\n¡Gracias!`;
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}`;
}
