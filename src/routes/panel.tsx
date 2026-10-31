import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Field } from "@/components/Field";
import { fmt, toISODate } from "@/lib/agenda";

export const Route = createFileRoute("/panel")({
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
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/panel` } });
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

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", u.user!.id).eq("role", "admin").maybeSingle();
    setIsAdmin(!!role);
    if (!role) return;
    const { data } = await supabase.from("bookings").select("*, services(name)")
      .gte("booking_date", toISODate(new Date())).order("booking_date").order("start_min");
    setRows((data as Row[]) ?? []);
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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Agenda del taller</h1>
          <p className="mt-1 text-muted-foreground">Próximos turnos de prueba</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm text-accent underline">Salir</button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Turnos hoy" value={active.filter((r) => r.booking_date === today).length} />
        <Stat label="Próximos turnos" value={active.length} />
        <Stat label="Horas reservadas" value={(active.reduce((a, r) => a + r.duration_min, 0) / 60).toFixed(1)} />
      </div>
      <label className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> Mostrar cancelados
      </label>
      {Object.keys(byDay).length === 0 && <p className="mt-8 text-muted-foreground">No hay turnos próximos.</p>}
      {Object.entries(byDay).map(([date, list]) => (
        <section key={date} className="mt-8">
          <h2 className="mb-3 text-xl font-semibold capitalize">
            {new Date(date + "T12:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          <div className="space-y-2">
            {list.map((r) => (
              <div key={r.id} className={`flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 ${r.status !== "confirmada" ? "opacity-50" : ""}`}>
                <div className="w-28 font-serif text-lg text-primary">{fmt(r.start_min)}–{fmt(r.start_min + r.duration_min)}</div>
                <div className="min-w-48 flex-1">
                  <p className="font-medium">{r.client_name} <span className="text-sm text-muted-foreground">· {r.client_phone}</span></p>
                  <p className="text-sm text-accent">{r.services?.name}</p>
                  {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}
                </div>
                {r.status === "confirmada" ? (
                  <button onClick={() => cancel(r.id)} className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-destructive hover:text-destructive">Cancelar</button>
                ) : <span className="text-sm">Cancelado</span>}
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
