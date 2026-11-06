<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- No backend or external services: all bookings, blocks and availability persist only in localStorage via src/lib/store.ts (overlap re-checked there before every write); slot math lives in src/lib/agenda.ts.
- The /admin panel is gated by a simple password constant in src/lib/admin.ts with a sessionStorage flag, as the brief requires.
