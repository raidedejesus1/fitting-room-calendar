import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY, bookAppointment, cancelByCode, getBookings, getBusy, moveBooking, addBlock, resetStore } from "@/lib/store";
import { isWorkday, toISODate } from "@/lib/agenda";

function nextWorkday(offset = 7) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  while (!isWorkday(d)) d.setDate(d.getDate() + 1);
  return toISODate(d);
}

describe("store en localStorage", () => {
  beforeEach(() => resetStore());

  it("guarda la reserva en localStorage", () => {
    const date = nextWorkday(20);
    bookAppointment({ service_id: "simple", date, start: 540, name: "Laura Pérez", phone: "11 5555-1234", notes: "" });
    expect(localStorage.getItem(STORAGE_KEY)).toContain("Laura Pérez");
  });

  it("no permite solapar dos turnos", () => {
    const date = nextWorkday(20);
    bookAppointment({ service_id: "ajuste", date, start: 540, name: "Laura Pérez", phone: "1155551234", notes: "" });
    expect(() => bookAppointment({ service_id: "simple", date, start: 560, name: "Ana Ruiz", phone: "1144443333", notes: "" })).toThrow();
  });

  it("una franja bloqueada no se puede reservar", () => {
    const date = nextWorkday(20);
    addBlock(date, 600, "Entrega");
    expect(getBusy(date)).toContainEqual({ start_min: 600, duration_min: 20 });
    expect(() => bookAppointment({ service_id: "simple", date, start: 600, name: "Ana Ruiz", phone: "1144443333", notes: "" })).toThrow();
  });

  it("mover y cancelar actualizan la reserva", () => {
    const date = nextWorkday(20);
    const code = bookAppointment({ service_id: "simple", date, start: 540, name: "Laura Pérez", phone: "11 5555-1234", notes: "" });
    const id = getBookings().find((b) => b.cancel_code === code)!.id;
    moveBooking(id, date, 620);
    expect(getBookings().find((b) => b.id === id)!.start_min).toBe(620);
    expect(cancelByCode(code, "1155551234")).toBe(true);
    expect(getBookings().find((b) => b.id === id)!.status).toBe("cancelada");
  });

  it("carga 8 reservas de ejemplo la primera vez", () => {
    expect(getBookings()).toHaveLength(8);
  });
});
