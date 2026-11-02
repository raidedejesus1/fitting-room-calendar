import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Field } from "@/components/Field";
import { whatsappSummaryUrl } from "@/lib/business";
import { fmt, isWorkday, slotsFor, toISODate, type Busy } from "@/lib/agenda";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reservá tu prueba · Taller de Costura Marta" },
      { name: "description", content: "Mirá los horarios libres del taller y reservá tu turno de prueba en un minuto." },
      { property: "og:title", content: "Reservá tu prueba · Taller de Costura Marta" },
      { property: "og:description", content: "Horarios libres reales y reserva directa, sin esperar que atiendan el teléfono." },
    ],
  }),
  component: Index,
});

type Service = { id: string; name: string; description: string; duration_min: number };

function nextDays(n: number) {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (out.length < n) {
    if (isWorkday(d)) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function Index() {
  const [services, setServices] = useState<Service[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const days = useMemo(() => nextDays(10), []);
  const [day, setDay] = useState<Date | null>(null);
  const [busy, setBusy] = useState<Busy[]>([]);
  const [slot, setSlot] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ code: string } | null>(null);

  useEffect(() => {
    supabase.from("services").select("*").order("sort").then(({ data }) => setServices(data ?? []));
    setDay(nextDays(1)[0] ?? null);
  }, []);

  const loadBusy = async (d: Date) => {
    const { data } = await supabase.rpc("get_busy", { _date: toISODate(d) });
    setBusy((data as Busy[]) ?? []);
  };
  useEffect(() => {
    if (day) loadBusy(day);
    setSlot(null);
  }, [day]);

  const slots = useMemo(() => {
    if (!service || !day) return [];
    const now = new Date();
    const isToday = toISODate(day) === toISODate(now);
    return slotsFor(service.duration_min, busy, isToday ? now.getHours() * 60 + now.getMinutes() : 0);
  }, [service, day, busy]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !day || slot === null) return;
    setSending(true);
    setError("");
    const { data, error } = await supabase.rpc("book_appointment", {
      _service: service.id, _date: toISODate(day), _start: slot,
      _name: form.name, _phone: form.phone, _notes: form.notes,
    });
    setSending(false);
    if (error) {
      setError(error.message);
      loadBusy(day);
      setSlot(null);
      return;
    }
    setDone({ code: data as string });
  };

  const dayLabel = (d: Date) => d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  if (done && service && day && slot !== null) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-xl px-5 py-16 text-center">
          <h1 className="text-4xl font-semibold">¡Te esperamos, {form.name.split(" ")[0]}!</h1>
          <p className="mt-4 text-muted-foreground">
            {service.name} · <span className="capitalize">{dayLabel(day)}</span> a las {fmt(slot)} hs.
          </p>
          <div className="stitch mx-auto mt-8 rounded-xl bg-card p-6">
            <p className="text-sm text-muted-foreground">Tu código para cancelar</p>
            <p className="mt-1 font-serif text-4xl tracking-widest text-accent">{done.code}</p>
            <p className="mt-3 text-sm text-muted-foreground">Guardalo: con este código y tu teléfono podés cancelar el turno.</p>
          </div>
          <a href={whatsappSummaryUrl({ name: form.name, service: service.name, day: dayLabel(day), time: fmt(slot), code: done.code })}
            target="_blank" rel="noopener noreferrer"
            className="mt-8 flex w-full items-center justify-center rounded-full bg-accent px-6 py-3 text-accent-foreground hover:opacity-90 sm:mx-auto sm:w-auto">
            Enviar resumen por WhatsApp
          </a>
          <button onClick={() => { setDone(null); setSlot(null); setForm({ name: "", phone: "", notes: "" }); if (day) loadBusy(day); }}
            className="mt-3 rounded-full border border-border px-6 py-3 hover:border-primary">
            Reservar otro turno
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <section className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">Turnos de prueba</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight md:text-5xl">
            Elegí tu arreglo y el horario que te quede cómodo.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Lunes a viernes de 9 a 13 y de 14 a 18 hs. Lo que ves acá es la agenda real del taller.
          </p>
        </section>

        <Step n={1} title="¿Qué necesitás?">
          <div className="grid gap-3 md:grid-cols-3">
            {services.map((s) => (
              <button key={s.id} onClick={() => { setService(s); setSlot(null); }}
                className={`rounded-xl border p-5 text-left transition ${service?.id === s.id ? "border-primary bg-card shadow-soft" : "border-border bg-card/60 hover:border-primary/50"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold">{s.name}</h3>
                  <span className="whitespace-nowrap rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{s.duration_min} min</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              </button>
            ))}
          </div>
        </Step>

        <Step n={2} title="Elegí el día">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => {
              const active = day && toISODate(d) === toISODate(day);
              return (
                <button key={d.toISOString()} onClick={() => setDay(d)}
                  className={`min-w-20 rounded-xl border px-3 py-3 text-center ${active ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card hover:border-accent/60"}`}>
                  <div className="text-xs capitalize opacity-80">{d.toLocaleDateString("es-AR", { weekday: "short" })}</div>
                  <div className="font-serif text-2xl">{d.getDate()}</div>
                  <div className="text-xs capitalize opacity-80">{d.toLocaleDateString("es-AR", { month: "short" })}</div>
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={3} title="Elegí el horario">
          {!service ? (
            <p className="text-muted-foreground">Primero elegí el tipo de arreglo.</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {slots.map((s) => (
                  <button key={s.start} disabled={!s.free} onClick={() => setSlot(s.start)}
                    className={`rounded-lg border py-2 text-sm ${slot === s.start ? "border-primary bg-primary text-primary-foreground" : s.free ? "border-border bg-card hover:border-primary" : "cursor-not-allowed border-transparent bg-muted text-muted-foreground line-through opacity-60"}`}>
                    {fmt(s.start)}
                  </button>
                ))}
              </div>
              {slots.every((s) => !s.free) && <p className="mt-3 text-muted-foreground">No quedan horarios este día. Probá con otro.</p>}
            </>
          )}
        </Step>

        {slot !== null && service && day && (
          <Step n={4} title="Tus datos">
            <form onSubmit={submit} className="stitch max-w-xl space-y-4 rounded-xl bg-card p-6">
              <p className="text-sm">
                <strong>{service.name}</strong> · <span className="capitalize">{dayLabel(day)}</span> · {fmt(slot)} a {fmt(slot + service.duration_min)} hs
              </p>
              <Field label="Nombre y apellido">
                <input required minLength={2} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Ej: Laura Pérez" />
              </Field>
              <Field label="Teléfono">
                <input required minLength={6} maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" placeholder="11 5555-1234" />
              </Field>
              <Field label="Contanos sobre la prenda (opcional)">
                <textarea maxLength={500} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" placeholder="Ej: vestido largo para un casamiento el 20/11" />
              </Field>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button disabled={sending} className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {sending ? "Reservando…" : "Confirmar turno"}
              </button>
            </form>
          </Step>
        )}
      </main>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-3 text-2xl font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-sans text-sm text-primary-foreground">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
