import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Field } from "@/components/Field";

export const Route = createFileRoute("/cancelar")({
  head: () => ({
    meta: [
      { title: "Cancelar turno · Taller de Costura Marta" },
      { name: "description", content: "Cancelá tu turno de prueba con tu código y teléfono." },
      { property: "og:title", content: "Cancelar turno · Taller de Costura Marta" },
      { property: "og:description", content: "Liberá tu horario para que otra clienta pueda usarlo." },
    ],
  }),
  component: Cancelar,
});

function Cancelar() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "fail" | "busy">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    const { data, error } = await supabase.rpc("cancel_booking", { _code: code, _phone: phone });
    setState(!error && data ? "ok" : "fail");
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-14">
        <h1 className="text-4xl font-semibold">Cancelar un turno</h1>
        <p className="mt-3 text-muted-foreground">¿Te surgió algo? No pasa nada. Así el horario queda libre para otra persona.</p>
        {state === "ok" ? (
          <div className="stitch mt-8 rounded-xl bg-card p-6">
            <p className="font-serif text-xl">Listo, tu turno quedó cancelado.</p>
            <p className="mt-2 text-sm text-muted-foreground">Cuando quieras, reservá otro desde la agenda.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="stitch mt-8 space-y-4 rounded-xl bg-card p-6">
            <Field label="Código de reserva">
              <input required value={code} onChange={(e) => setCode(e.target.value)} className="input uppercase tracking-widest" placeholder="Ej: A1B2C3" />
            </Field>
            <Field label="Teléfono con el que reservaste">
              <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="11 5555-1234" />
            </Field>
            {state === "fail" && <p className="text-sm text-destructive">No encontramos un turno activo con esos datos.</p>}
            <button disabled={state === "busy"} className="w-full rounded-full bg-accent py-3 font-medium text-accent-foreground hover:opacity-90">
              Cancelar turno
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
