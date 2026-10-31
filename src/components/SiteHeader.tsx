import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link to="/" className="font-serif text-xl font-semibold text-foreground">
          Taller de Costura <span className="italic text-primary">Marta</span>
        </Link>
        <nav className="flex gap-5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary" activeProps={{ className: "text-primary" }} activeOptions={{ exact: true }}>Reservar</Link>
          <Link to="/cancelar" className="hover:text-primary" activeProps={{ className: "text-primary" }}>Cancelar turno</Link>
          <Link to="/panel" className="hover:text-primary" activeProps={{ className: "text-primary" }}>Panel</Link>
        </nav>
      </div>
    </header>
  );
}
