# Taller de Costura Marta · Turnos de prueba

Agenda online para que las clientas de una modista vean la disponibilidad real y reserven, sin coordinar por teléfono.

## Qué hace

- **Reservar** (`/`): elegir arreglo → día → horario libre → nombre y teléfono. Al confirmar se muestra un código de cancelación.
- **Cancelar** (`/cancelar`): con el código y el teléfono de la reserva.
- **Confirmación:** después de reservar, un botón **Enviar resumen por WhatsApp** abre WhatsApp con el resumen del turno ya escrito, dirigido al número del taller.
- **El taller** (`/taller`): qué ofrece, cómo llegar (con enlace a Google Maps), horarios de atención y redes sociales.
- **Panel** (`/admin`): pide una clave simple antes de mostrar cualquier reserva. Muestra la agenda por día y permite **mover** y **cancelar** turnos y **bloquear franjas** (horas que el taller reserva sin clienta), todo sin recargar la página. Las franjas bloqueadas no se ofrecen en la agenda. `/panel` redirige a `/admin`.
- **Aviso de almacenamiento:** si el navegador bloquea o no admite `localStorage`, aparece un aviso arriba de todo. Se puede usar la agenda, pero los cambios se pierden al cerrar la pestaña.

**Sin backend ni servicios externos:** todas las reservas, bloqueos y la disponibilidad se guardan solo en el `localStorage` del navegador (clave `taller-marta:v1`, código en `src/lib/store.ts`). Cada navegador tiene su propia agenda.

Reglas: lunes a viernes de 9:00 a 13:00 y de 14:00 a 18:00, franjas de 20 minutos. Cada franja admite un solo turno; un arreglo de 40 o 60 minutos ocupa 2 o 3 franjas seguidas. Antes de guardar, al reservar, mover o bloquear, se vuelve a verificar que no haya solapamientos.

## Cómo correrlo

- **En Lovable:** abrí el proyecto; la vista previa ya está funcionando.
- **En local** (requiere [Bun](https://bun.sh)):
  ```bash
  bun install
  bun run dev       # http://localhost:8080
  bunx vitest run   # pruebas de horarios y de reservas
  ```
  No hace falta configurar ninguna variable de entorno ni clave.

## Datos de ejemplo (simulados)

Todo esto es simulado y se puede reemplazar:

- El nombre del taller, «Taller de Costura Marta».
- Los tres arreglos del catálogo (`src/lib/store.ts`): Arreglo simple (20 min), Ajuste de prenda completa (40 min) y Confección a medida (60 min).
- Los datos del negocio en `src/lib/business.ts`: dirección (Av. Díaz Vélez 4321, Almagro), WhatsApp (+54 9 11 5555-0123), Instagram y Facebook, además de los textos de `/taller`.
- 8 reservas de prueba con clientas, teléfonos y notas inventadas, en los 5 días hábiles siguientes a la primera visita. Códigos de cancelación: `LUC001`, `MAR002`, `SOF003`, `CAR004`, `VAL005`, `JUL006`, `PAU007`, `ANA008`.
- 1 franja bloqueada («Retiro de telas en la mercería», el próximo miércoles a las 17:00).
- La clave del panel, `costura2026`.

Los datos de ejemplo se cargan solos la primera vez que se abre la app en un navegador.

## Cómo reiniciar el estado

Cualquiera de estas opciones vuelve a los datos de ejemplo:

1. En `/admin`, tocá **Reiniciar datos de ejemplo**.
2. O en la consola del navegador: `localStorage.removeItem("taller-marta:v1")` y recargá.
3. O borrá los datos del sitio desde la configuración del navegador.

## Acceso al panel y cómo cambiar la clave

1. Entrá a `/admin` e ingresá la clave (por defecto `costura2026`). El acceso dura mientras la pestaña esté abierta; **Salir** lo cierra.
2. **Para cambiar la clave:** editá `ADMIN_PASSWORD` en `src/lib/admin.ts` y volvé a publicar.
3. Es una barrera simple pedida para la demo: la clave está en el código, así que no reemplaza una seguridad real.

## Tecnología

TanStack Start (React) y Tailwind CSS, sin backend: persistencia en `localStorage`. La lógica de horarios está en `src/lib/agenda.ts`, con sus pruebas en `src/test/agenda.test.ts`.
