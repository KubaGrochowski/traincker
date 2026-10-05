-- Grochu's gym — jednorazowa konfiguracja bazy (Supabase → SQL Editor → New query → wklej → Run).
-- Ten sam projekt Supabase co Grochu's tracker i Grochu's makro, więc konto (e-mail + hasło) jest wspólne.

-- Dane użytkownika: jeden wiersz na konto (ustawienia, treningi, plany, własne ćwiczenia, masa ciała).
create table if not exists public.gym_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.gym_data enable row level security;

drop policy if exists "gym_data: własny wiersz" on public.gym_data;
create policy "gym_data: własny wiersz" on public.gym_data
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- synchronizacja na żywo między urządzeniami
do $$ begin
  alter publication supabase_realtime add table public.gym_data;
exception when duplicate_object then null; end $$;
