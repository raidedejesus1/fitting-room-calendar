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

- Booking writes go only through SECURITY DEFINER RPCs (book_appointment, cancel_booking, get_busy) so anonymous clients never read client data; slot math lives in src/lib/agenda.ts and is mirrored in book_appointment.
- Admin access uses public.user_roles + has_role(); the first signed-up user becomes admin via trigger.
