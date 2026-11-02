import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { BUSINESS } from "@/lib/business";

export const Route = createFileRoute("/taller")({
  head: () => ({
    meta: [
      { title: "El taller · Taller de Costura Marta" },
      { name: "description", content: "Arreglos, ajustes y confección a medida en Almagro. Cómo llegar, horarios y redes." },
      { property: "og:title", content: "El taller · Taller de Costura Marta" },
      { property: "og:description", content: "Arreglos, ajustes y confección a medida. Cómo llegar, horarios y redes." },
    ],
  }),
  component: Taller,
});

const offer = [
  ["Arreglos simples", "Bastillas, ruedos, botones y zurcidos. Turno de 20 minutos."],
  ["Ajuste de prendas", "Entallamos vestidos, trajes y sacos para que te queden como hechos para vos. Turno de 40 minutos."],
  ["Confección a medida", "Vestidos de fiesta, novia y egresada. Primera prueba de 60 minutos."],
];

function Taller() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-12 px-5 py-10">
        <section>
          <p className="text-sm uppercase tracking-[0.2em] text-accent">El taller</p>
          <h1 className="mt-2 text-4xl font-semibold">Costura con tiempo y cariño</h1>
          <h2 className="mt-8 text-2xl font-semibold">Qué ofrecemos</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {offer.map(([t, d]) => (
              <div key={t} className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
          <Link to="/" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">Reservar un turno</Link>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Cómo llegar</h2>
          <p className="mt-2">{BUSINESS.address}</p>
          <p className="text-sm text-muted-foreground">A 3 cuadras de la estación Castro Barros (línea A). Timbre «Taller».</p>
          <a href={BUSINESS.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-accent underline">Ver en Google Maps</a>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Horarios de atención</h2>
          <dl className="stitch mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-xl bg-card p-4 text-sm">
            <dt className="font-medium">Lunes a viernes</dt><dd>9:00 a 13:00 y 14:00 a 18:00</dd>
            <dt className="font-medium">Sábados y domingos</dt><dd>Cerrado</dd>
          </dl>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Redes sociales</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <a href={BUSINESS.instagram} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary">Instagram</a>
            <a href={BUSINESS.facebook} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary">Facebook</a>
            <a href={`https://wa.me/${BUSINESS.whatsapp}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary">WhatsApp</a>
          </div>
        </section>
      </main>
    </div>
  );
}
