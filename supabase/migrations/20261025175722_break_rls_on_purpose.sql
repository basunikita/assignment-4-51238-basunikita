-- Handout Step 7: break row-level security on purpose to watch the
-- Playwright privacy test fail. Undone by the restore_rls migration.
create policy "BROKEN ON PURPOSE: everyone can read every pick"
  on public.picks for select
  to authenticated
  using (true);
