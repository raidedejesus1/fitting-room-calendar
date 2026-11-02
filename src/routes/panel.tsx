import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/panel")({
  beforeLoad: () => { throw redirect({ to: "/admin" }); },
});
