// Toda la persistencia vive en localStorage del navegador (sin backend).
import { BLOCKS, STEP, isWorkday, toISODate, type Busy } from "@/lib/agenda";

export const STORAGE_KEY = "taller-marta:v1";

export type Service = { id: string; name: string; description: string; duration_min: number };
export type Booking = {
  id: string; service_id: string; booking_date: string; start_min: number; duration_min: number;
  client_name: string; client_phone: string; notes: string; status: "confirmada" | "cancelada"; cancel_code: string;
};
export type Block = { id: string; block_date: string; start_min: number; duration_min: number; reason: string };
type State = { bookings: Booking[]; blocks: Block[] };

export const SERVICES: Service[] = [
  { id: "simple", name: "Arreglo simple", description: "Bastillas, botones, pequeños zurcidos.", duration_min: 20 },
  { id: "ajuste", name: "Ajuste de prenda completa", description: "Entallar, achicar o agrandar un vestido, traje o saco.", duration_min: 40 },
  { id: "medida", name: "Confección a medida", description: "Primera prueba de una prenda hecha para vos.", duration_min: 60 },
];
export const serviceName = (id: string) => SERVICES.find((s) => s.id === id)?.name ?? id;

let memory: State | null = null; // respaldo si localStorage está bloqueado

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nextWorkdays(n: number, from = new Date()) {
  const out: string[] = [];
  const d = new Date(from); d.setHours(12, 0, 0, 0);
  while (out.length < n) { d.setDate(d.getDate() + 1); if (isWorkday(d)) out.push(toISODate(d)); }
  return out;
}

export function seed(from = new Date()): State {
  const [d1, d2, d3, d4, d5] = nextWorkdays(5, from) as [string, string, string, string, string];
  const b = (code: string, service_id: string, date: string, start: number, name: string, phone: string, notes: string): Booking => ({
    id: uid(), service_id, booking_date: date, start_min: start,
    duration_min: SERVICES.find((s) => s.id === service_id)!.duration_min,
    client_name: name, client_phone: phone, notes, status: "confirmada", cancel_code: code,
  });
  const wed = nextWorkdays(10, from).find((x) => new Date(x + "T12:00").getDay() === 3)!;
  return {
    bookings: [
      b("LUC001", "ajuste", d1, 540, "Lucía Fernández", "11 4567-2231", "Vestido de fiesta para casamiento del 21/11"),
      b("MAR002", "simple", d1, 620, "Mariana Gómez", "11 3344-8890", "Bastilla de pantalón de vestir"),
      b("SOF003", "medida", d1, 840, "Sofía Ramírez", "11 6012-4478", "Primera prueba de vestido de egresada"),
      b("CAR004", "simple", d2, 600, "Carolina Ruiz", "11 2789-1103", "Cambio de cierre en campera"),
      b("VAL005", "ajuste", d2, 900, "Valeria Sosa", "11 5521-7764", "Achicar saco de lino"),
      b("JUL006", "medida", d3, 660, "Julieta Morales", "11 4890-3312", "Traje sastre a medida"),
      b("PAU007", "simple", d4, 960, "Paula Benítez", "11 3678-0091", "Botones de tapado"),
      b("ANA008", "ajuste", d5, 560, "Ana Torres", "11 6234-5587", "Entallar vestido de madrina"),
    ],
    blocks: [{ id: uid(), block_date: wed, start_min: 1020, duration_min: 20, reason: "Retiro de telas en la mercería" }],
  };
}

function read(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as State;
    const s = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return s;
  } catch {
    return (memory ??= seed());
  }
}

function write(s: State) {
  memory = s;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* sin almacenamiento: queda en memoria */ }
}

export function resetStore() {
  memory = null;
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}

export function getBookings() { return read().bookings; }
export function getBlocks() { return read().blocks; }

export function getBusy(date: string, excludeId?: string): Busy[] {
  const s = read();
  return [
    ...s.bookings.filter((b) => b.booking_date === date && b.status === "confirmada" && b.id !== excludeId),
    ...s.blocks.filter((b) => b.block_date === date),
  ].map(({ start_min, duration_min }) => ({ start_min, duration_min }));
}

function checkSlot(date: string, start: number, duration: number, excludeId?: string) {
  if (date < toISODate(new Date()) || !isWorkday(new Date(date + "T12:00"))) throw new Error("Día no disponible.");
  const end = start + duration;
  if (start % STEP !== 0 || !BLOCKS.some(([a, b]) => start >= a && end <= b)) throw new Error("Horario fuera de atención.");
  if (getBusy(date, excludeId).some((x) => x.start_min < end && start < x.start_min + x.duration_min))
    throw new Error("Ese horario se acaba de ocupar. Elegí otro.");
}

export function bookAppointment(p: { service_id: string; date: string; start: number; name: string; phone: string; notes: string }) {
  const svc = SERVICES.find((s) => s.id === p.service_id);
  if (!svc) throw new Error("Arreglo inválido.");
  if (p.name.trim().length < 2) throw new Error("Completá tu nombre.");
  if (p.phone.trim().length < 6) throw new Error("Completá tu teléfono.");
  checkSlot(p.date, p.start, svc.duration_min);
  const s = read();
  const code = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "X");
  s.bookings.push({
    id: uid(), service_id: svc.id, booking_date: p.date, start_min: p.start, duration_min: svc.duration_min,
    client_name: p.name.trim(), client_phone: p.phone.trim(), notes: p.notes.trim(), status: "confirmada", cancel_code: code,
  });
  write(s);
  return code;
}

const digits = (x: string) => x.replace(/\D/g, "");

export function cancelByCode(code: string, phone: string) {
  const s = read();
  const b = s.bookings.find((x) => x.status === "confirmada" && x.cancel_code === code.trim().toUpperCase() && digits(x.client_phone) === digits(phone));
  if (!b) return false;
  b.status = "cancelada"; write(s); return true;
}

export function cancelBooking(id: string) {
  const s = read();
  const b = s.bookings.find((x) => x.id === id);
  if (b) { b.status = "cancelada"; write(s); }
}

export function moveBooking(id: string, date: string, start: number) {
  const s = read();
  const b = s.bookings.find((x) => x.id === id);
  if (!b) throw new Error("Turno no encontrado.");
  checkSlot(date, start, b.duration_min, id);
  b.booking_date = date; b.start_min = start; write(s);
}

export function addBlock(date: string, start: number, reason: string) {
  checkSlot(date, start, STEP);
  const s = read();
  s.blocks.push({ id: uid(), block_date: date, start_min: start, duration_min: STEP, reason: reason.trim() || "Bloqueado por el taller" });
  write(s);
}

export function removeBlock(id: string) {
  const s = read(); s.blocks = s.blocks.filter((b) => b.id !== id); write(s);
}
