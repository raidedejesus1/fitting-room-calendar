import { useEffect, useState } from "react";

export function storageAvailable() {
  try {
    const k = "__taller_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function StorageNotice() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => setBlocked(!storageAvailable()), []);
  if (!blocked) return null;
  return (
    <div role="alert" className="border-b border-border bg-secondary px-5 py-2 text-center text-sm text-secondary-foreground">
      Tu navegador tiene bloqueado el almacenamiento local. Podés usar la agenda, pero las reservas no se guardan al cerrar la pestaña. Activá las cookies y datos de sitios para este sitio.
    </div>
  );
}
