# Taller de Costura Marta · Turnos de prueba

Agenda online para que las clientas de una modista vean la disponibilidad real y reserven, sin coordinar por teléfono.

## Qué hace

- **Reservar** (`/`): elegir arreglo → día → horario libre → nombre y teléfono. Al confirmar se muestra un código de cancelación.
- **Cancelar** (`/cancelar`): con el código y el teléfono de la reserva.
- **Confirmación:** después de reservar, un botón **Enviar resumen por WhatsApp** abre WhatsApp con el resumen del turno ya escrito, dirigido al número del taller.
- **El taller** (`/taller`): qué ofrece, cómo llegar (con enlace a Google Maps), horarios de atención y redes sociales.
- **Panel** (`/admin`): pide email y clave antes de mostrar cualquier reserva. Muestra la agenda por día, y permite **mover** y **cancelar** turnos y **bloquear franjas** (horas que el taller reserva sin clienta), todo sin recargar la página. Las franjas bloqueadas no se ofrecen en la agenda. `/panel` redirige a `/admin`.
- **Aviso de almacenamiento:** si el navegador bloquea o no admite el almacenamiento local, aparece un aviso arriba de todo. Se puede reservar igual, pero no mantener la sesión del panel.

Reglas: lunes a viernes de 9:00 a 13:00 y de 14:00 a 18:00, franjas de 20 minutos. Cada franja admite un solo turno; un arreglo de 40 o 60 minutos ocupa 2 o 3 franjas seguidas. La base de datos vuelve a verificar que no haya solapamientos al reservar y al mover, así dos personas no pueden tomar el mismo horario aunque reserven a la vez.

## Cómo correrlo

- **En Lovable:** abrí el proyecto; la vista previa ya está funcionando.
- **En local** (requiere [Bun](https://bun.sh)):
  ```bash
  bun install
  bun run dev       # http://localhost:8080
  bunx vitest run   # pruebas de la lógica de horarios
  ```
  El archivo `.env` ya trae la URL y la clave pública de la base de datos.

## Datos de ejemplo

Todo esto es de ejemplo y se puede reemplazar:

- El nombre del taller, «Taller de Costura Marta».
- Los tres arreglos del catálogo: Arreglo simple (20 min), Ajuste de prenda completa (40 min) y Confección a medida (60 min).
- Los datos del negocio en `src/lib/business.ts`: dirección (Av. Díaz Vélez 4321, Almagro), número de WhatsApp (+54 9 11 5555-0123), Instagram y Facebook, además de los textos de `/taller`.
- 1 franja bloqueada de ejemplo («Retiro de telas en la mercería», miércoles a las 17:00).
- 8 reservas de prueba con clientas, teléfonos y notas inventadas, en los días hábiles siguientes a la instalación. Sus códigos de cancelación van de `LUC001` a `ANA008`.

## Acceso al panel y cómo cambiar la clave

1. Entrá a `/admin` y elegí **Crear cuenta**. **La primera cuenta que se crea queda como dueña del panel.** Las cuentas que se creen después no ven ninguna reserva.
2. Confirmá el email que te llega y entrá con tu email y tu clave.
3. **Para cambiar la clave:** dentro del panel tocá **Cambiar clave**, escribí la nueva (mínimo 6 caracteres) y tocá **Guardar**.
4. Si olvidaste la clave, desde Lovable podés administrar el usuario en **Cloud → Users**.

## Tecnología

TanStack Start (React), Tailwind CSS y Lovable Cloud (base de datos y acceso con cuenta). La lógica de horarios está en `src/lib/agenda.ts`, con sus pruebas en `src/test/agenda.test.ts`.
