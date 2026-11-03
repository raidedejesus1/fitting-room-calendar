import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Field } from "@/components/Field";
import { fmt, isWorkday, slotsFor, toISODate, type Busy } from "@/lib/agenda";

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

type Block = { id: string; block_date: string; start_min: number; duration_min: number; reason: string };
type Row = {
  id: string; booking_date: string; start_min: number; duration_min: number; client_name: string;
  client_phone: string; notes: string | null; status: string; cancel_code: string; services: { name: string } | null;
};

function Panel() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        {!ready ? null : session ? <Agenda /> : <Login />}
      </main>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("Email o contraseña incorrectos.");
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      setMsg(error ? error.message : "Te enviamos un email para confirmar la cuenta.");
    }
  };
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-3xl font-semibold">Panel del taller</h1>
      <p className="mt-2 text-sm text-muted-foreground">Solo para la modista. La primera cuenta creada queda como dueña del panel.</p>
      <form onSubmit={submit} className="stitch mt-6 space-y-4 rounded-xl bg-card p-6">
        <Field label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></Field>
        <Field label="Contraseña"><input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input" /></Field>
        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        <button className="w-full rounded-full bg-primary py-3 font-medium text-primary-foreground">{mode === "in" ? "Entrar" : "Crear cuenta"}</button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-accent underline">
          {mode === "in" ? "Crear cuenta" : "Ya tengo cuenta"}
        </button>
      </form>
    </div>
  );
}

function Agenda() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", u.user!.id).eq("role", "admin").maybeSingle();
    setIsAdmin(!!role);
    if (!role) return;
    const { data } = await supabase.from("bookings").select("*, services(name)")
      .gte("booking_date", toISODate(new Date())).order("booking_date").order("start_min");
    setRows((data as Row[]) ?? []);
    const { data: bl } = await supabase.from("time_blocks").select("*")
      .gte("block_date", toISODate(new Date())).order("block_date").order("start_min");
    setBlocks((bl as Block[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id: string) => {
    if (!confirm("¿Cancelar este turno?")) return;
    await supabase.from("bookings").update({ status: "cancelada" }).eq("id", id);
    load();
  };

  if (isAdmin === false) return (
    <div className="text-center">
      <p>Esta cuenta no tiene acceso al panel.</p>
      <button onClick={() => supabase.auth.signOut()} className="mt-4 text-accent underline">Salir</button>
    </div>
  );
  if (!rows) return <p className="text-muted-foreground">Cargando agenda…</p>;

  const visible = rows.filter((r) => showCancelled || r.status === "confirmada");
  const active = rows.filter((r) => r.status === "confirmada");
  const today = toISODate(new Date());
  const byDay = visible.reduce<Record<string, Row[]>>((acc, r) => ((acc[r.booking_date] ??= []).push(r), acc), {});
  for (const b of blocks) byDay[b.block_date] ??= [];
  const days = Object.keys(byDay).sort();
  const removeBlock = async (id: string) => { await supabase.from("time_blocks").delete().eq("id", id); load(); };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Agenda del taller</h1>
          <p className="mt-1 text-muted-foreground">Próximos turnos de prueba</p>
        </div>
        <div className="flex gap-4">
          <ChangePassword />
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-accent underline">Salir</button>
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
                  <p className="text-sm text-accent">{r.services?.name}</p>
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
  const [busy, setBusy] = useState<Busy[]>([]);
  const [start, setStart] = useState<number | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    setStart(null);
    supabase.rpc("get_busy", { _date: date }).then(({ data }) => setBusy((data as Busy[]) ?? []));
  }, [date]);
  const workday = isWorkday(new Date(date + "T12:00"));
  // Exclude this booking's own slot so it can shift within the same day
  const others = busy.filter((b) => !(date === row.booking_date && b.start_min === row.start_min));
  const free = workday ? slotsFor(row.duration_min, others).filter((s) => s.free) : [];
  const save = async () => {
    if (start === null) return;
    const { error } = await supabase.rpc("move_booking", { _id: row.id, _date: date, _start: start });
    if (error) setErr(error.message); else onDone();
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

function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  if (!open) return <button onClick={() => setOpen(true)} className="text-sm text-accent underline">Cambiar clave</button>;
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={async (e) => {
      e.preventDefault();
      const { error } = await supabase.auth.updateUser({ password: pw });
      setMsg(error ? error.message : "Clave actualizada");
      if (!error) setPw("");
    }}>
      <input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} className="input w-40" placeholder="Nueva clave" />
      <button className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Guardar</button>
      {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
    </form>
  );
}

function BlockForm({ onDone }: { onDone: () => void }) {
  const [date, setDate] = useState(toISODate(new Date()));
  const [busy, setBusy] = useState<Busy[]>([]);
  const [start, setStart] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const refresh = () => supabase.rpc("get_busy", { _date: date }).then(({ data }) => setBusy((data as Busy[]) ?? []));
  useEffect(() => { setStart(null); refresh(); }, [date]);
  const workday = isWorkday(new Date(date + "T12:00"));
  const free = workday ? slotsFor(20, busy).filter((s) => s.free) : [];
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (start === null) return;
    const { error } = await supabase.rpc("add_block", { _date: date, _start: start, _reason: reason });
    if (error) { setErr(error.message); return; }
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
