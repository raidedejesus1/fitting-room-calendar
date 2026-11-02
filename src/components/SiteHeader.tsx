import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
        <Link to="/" className="font-serif text-xl font-semibold text-foreground">
          Taller de Costura <span className="italic text-primary">Marta</span>
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary" activeProps={{ className: "text-primary" }} activeOptions={{ exact: true }}>Reservar</Link>
          <Link to="/cancelar" className="hover:text-primary" activeProps={{ className: "text-primary" }}>Cancelar turno</Link>
          <Link to="/taller" className="hover:text-primary" activeProps={{ className: "text-primary" }}>El taller</Link>
          <Link to="/admin" className="hover:text-primary" activeProps={{ className: "text-primary" }}>Panel</Link>
        </nav>
      </div>
    </header>
  );
}
