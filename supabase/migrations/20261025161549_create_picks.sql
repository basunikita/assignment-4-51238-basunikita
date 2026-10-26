-- One row per pick. user_id always comes from the Clerk session token's
-- "sub" claim, never from the app, and row-level security keys on it.
create table public.picks (
  id bigint generated always as identity primary key,
  user_id text not null default (auth.jwt() ->> 'sub'),
  artwork_id integer not null,
  title text not null,
  artist text not null,
  date_display text,
  image_id text not null,
  alt_text text,
  color_h smallint,
  color_s smallint,
  color_l smallint,
  picked_at timestamptz not null default now()
);

create index picks_user_id_picked_at_idx on public.picks (user_id, picked_at);

alter table public.picks enable row level security;

create policy "People can read their own picks"
  on public.picks for select
  to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "People can add their own picks"
  on public.picks for insert
  to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

grant select, insert on table public.picks to authenticated;
