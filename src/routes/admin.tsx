import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ADMIN_PASSWORD, ADMIN_SESSION_KEY } from "@/lib/admin";
import { addBlock, cancelBooking, getBlocks, getBookings, getBusy, moveBooking, removeBlock as dropBlock, serviceName, type Block, type Booking } from "@/lib/store";
import { SiteHeader } from "@/components/SiteHeader";
import { Field } from "@/components/Field";
import { fmt, isWorkday, slotsFor, toISODate } from "@/lib/agenda";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel del taller · Taller de Costura Marta" },
      { name: "description", content: "Agenda de turnos de prueba del taller." },
      { property: "og:title", content: "Panel del taller · Taller de Costura Marta" },
      { property: "og:description", content: "Agenda de turnos de prueba del taller." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Panel,
});

type Row = Booking;

function readFlag() {
  try { return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "1"; } catch { return false; }
}
function setFlag(on: boolean) {
  try { on ? window.sessionStorage.setItem(ADMIN_SESSION_KEY, "1") : window.sessionStorage.removeItem(ADMIN_SESSION_KEY); } catch { /* noop */ }
}

function Panel() {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { setUnlocked(readFlag()); setReady(true); }, []);
  const lock = () => { setFlag(false); setUnlocked(false); };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        {!ready ? null : unlocked ? <Agenda onLock={lock} /> : <Login onOk={() => { setFlag(true); setUnlocked(true); }} />}
      </main>
    </div>
  );
}

function Login({ onOk }: { onOk: () => void }) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) onOk(); else setMsg("Clave incorrecta.");
  };
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-3xl font-semibold">Panel del taller</h1>
      <p className="mt-2 text-sm text-muted-foreground">Solo para la modista. Ingresá la clave del panel.</p>
      <form onSubmit={submit} className="stitch mt-6 space-y-4 rounded-xl bg-card p-6">
        <Field label="Clave"><input type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className="input" /></Field>
        {msg && <p className="text-sm text-destructive">{msg}</p>}
        <button className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground">Entrar</button>
      </form>
    </div>
  );
}

function Agenda({ onLock }: { onLock: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);

  const load = () => {
    const today = toISODate(new Date());
    setRows(getBookings().filter((r) => r.booking_date >= today)
      .sort((x, y) => x.booking_date.localeCompare(y.booking_date) || x.start_min - y.start_min));
    setBlocks(getBlocks().filter((b) => b.block_date >= today)
      .sort((x, y) => x.block_date.localeCompare(y.block_date) || x.start_min - y.start_min));
  };
  useEffect(() => { load(); }, []);

  const cancel = (id: string) => {
    if (!confirm("¿Cancelar este turno?")) return;
    cancelBooking(id);
    load();
  };

  if (!rows) return <p className="text-muted-foreground">Cargando agenda…</p>;

  const visible = rows.filter((r) => showCancelled || r.status === "confirmada");
  const active = rows.filter((r) => r.status === "confirmada");
  const today = toISODate(new Date());
  const byDay = visible.reduce<Record<string, Row[]>>((acc, r) => ((acc[r.booking_date] ??= []).push(r), acc), {});
  for (const b of blocks) byDay[b.block_date] ??= [];
  const days = Object.keys(byDay).sort();
  const removeBlock = (id: string) => { dropBlock(id); load(); };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Agenda del taller</h1>
          <p className="mt-1 text-muted-foreground">Próximos turnos de prueba</p>
        </div>
        <div className="flex gap-4">
          <button onClick={onLock} className="text-sm text-accent underline">Salir</button>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Turnos hoy" value={active.filter((r) => r.booking_date === today).length} />
        <Stat label="Próximos turnos" value={active.length} />
        <Stat label="Horas reservadas" value={(active.reduce((a, r) => a + r.duration_min, 0) / 60).toFixed(1)} />
      </div>
      <label className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Mostrar cancelados
      </label>
      <BlockForm onDone={load} />
      {days.length === 0 && <p className="mt-8 text-muted-foreground">No hay turnos próximos.</p>}
      {days.map((date) => [date, byDay[date] ?? []] as const).map(([date, list]) => (
        <section key={date} className="mt-8">
          <h2 className="mb-3 text-xl font-semibold capitalize">
            {new Date(date + "T12:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          <div className="space-y-2">
            {blocks.filter((b) => b.block_date === date).map((b) => (
              <div key={b.id} className="stitch flex flex-wrap items-center gap-4 rounded-xl bg-muted p-4">
                <div className="w-28 font-serif text-lg text-muted-foreground">{fmt(b.start_min)}–{fmt(b.start_min + b.duration_min)}</div>
                <p className="min-w-0 flex-1 text-sm"><span className="font-medium">Bloqueado</span> · {b.reason}</p>
                <button onClick={() => removeBlock(b.id)} className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-accent hover:text-accent">Liberar</button>
              </div>
            ))}
            {list.map((r) => (
              <div key={r.id} className={`flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 ${r.status !== "confirmada" ? "opacity-50" : ""}`}>
                <div className="w-28 font-serif text-lg text-primary">{fmt(r.start_min)}–{fmt(r.start_min + r.duration_min)}</div>
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{r.client_name} <span className="text-sm text-muted-foreground">· {r.client_phone}</span></p>
                  <p className="text-sm text-accent">{serviceName(r.service_id)}</p>
                  {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}
                </div>
                {r.status === "confirmada" ? (
                  <div className="flex gap-2">
                    <button onClick={() => setMoving(moving === r.id ? null : r.id)} className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-accent hover:text-accent">Mover</button>
                    <button onClick={() => cancel(r.id)} className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-destructive hover:text-destructive">Cancelar</button>
                  </div>
                ) : <span className="text-sm">Cancelado</span>}
                {moving === r.id && <MoveForm row={r} onDone={() => { setMoving(null); load(); }} />}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="stitch rounded-xl bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-serif text-3xl text-foreground">{value}</p>
    </div>
  );
}

function MoveForm({ row, onDone }: { row: Row; onDone: () => void }) {
  const [date, setDate] = useState(row.booking_date);
  const [start, setStart] = useState<number | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { setStart(null); }, [date]);
  const workday = isWorkday(new Date(date + "T12:00"));
  // Exclude this booking's own slot so it can shift within the same day
  const others = getBusy(date, row.id);
  const free = workday ? slotsFor(row.duration_min, others).filter((s) => s.free) : [];
  const save = () => {
    if (start === null) return;
    try { moveBooking(row.id, date, start); onDone(); } catch (e) { setErr((e as Error).message); }
  };
  return (
    <div className="w-full space-y-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-3">
        <input type="date" min={toISODate(new Date())} value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto" />
        {!workday && <span className="text-sm text-muted-foreground">El taller atiende de lunes a viernes.</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {free.map((s) => (
          <button key={s.start} onClick={() => setStart(s.start)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${start === s.start ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
            {fmt(s.start)}
          </button>
        ))}
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button disabled={start === null} onClick={save} className="rounded-full bg-accent px-5 py-2 text-sm text-accent-foreground disabled:opacity-50">Guardar nuevo horario</button>
    </div>
  );
}

function BlockForm({ onDone }: { onDone: () => void }) {
  const [date, setDate] = useState(toISODate(new Date()));
  const [start, setStart] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(tick + 1);
  useEffect(() => { setStart(null); }, [date]);
  const busy = getBusy(date);
  const workday = isWorkday(new Date(date + "T12:00"));
  const free = workday ? slotsFor(20, busy).filter((s) => s.free) : [];
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (start === null) return;
    try { addBlock(date, start, reason); } catch (er) { setErr((er as Error).message); return; }
    setErr(""); setStart(null); setReason(""); refresh(); onDone();
  };
  return (
    <form onSubmit={save} className="stitch mt-6 space-y-3 rounded-xl bg-card p-4">
      <h2 className="text-xl font-semibold">Bloquear una franja</h2>
      <p className="text-sm text-muted-foreground">Para horas que el taller usa sin clienta. No se ofrecen en la agenda.</p>
      <div className="flex flex-wrap gap-2">
        <input type="date" min={toISODate(new Date())} value={date} onChange={(e) => setDate(e.target.value)} className="input w-auto" />
        <input value={reason} maxLength={100} onChange={(e) => setReason(e.target.value)} className="input min-w-0 flex-1" placeholder="Motivo (ej: entrega de pedido)" />
      </div>
      {!workday && <p className="text-sm text-muted-foreground">El taller atiende de lunes a viernes.</p>}
      <div className="flex flex-wrap gap-2">
        {free.map((s) => (
          <button type="button" key={s.start} onClick={() => setStart(s.start)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${start === s.start ? "border-accent bg-accent text-accent-foreground" : "border-border bg-background"}`}>
            {fmt(s.start)}
          </button>
        ))}
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button disabled={start === null} className="rounded-full bg-accent px-5 py-2 text-sm text-accent-foreground disabled:opacity-50">Bloquear franja</button>
    </form>
  );
}
