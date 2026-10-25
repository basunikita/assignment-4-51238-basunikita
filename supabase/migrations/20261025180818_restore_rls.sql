-- Handout Step 7: undo break_rls_on_purpose. Run by the student in the SQL editor; the MCP server's confirmation could not be shown.
drop policy "BROKEN ON PURPOSE: everyone can read every pick" on public.picks;
