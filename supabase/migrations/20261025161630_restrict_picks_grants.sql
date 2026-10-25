-- Supabase's default privileges give anon and authenticated every privilege
-- on new tables, leaving row-level security as the only gate, and TRUNCATE
-- is not covered by row-level security at all. Keep only what the two
-- policies allow: signed-in people may select and insert.
revoke all on table public.picks from anon;
revoke update, delete, truncate, references, trigger on table public.picks from authenticated;
