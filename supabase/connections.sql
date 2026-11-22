-- Traincker — połączenia kont (Supabase → SQL Editor → New query → wklej → Run). Można uruchomić wiele razy.
-- Każde konto może wygenerować swój stały kod. Druga osoba wpisuje kod → zaproszenie → właściciel kodu akceptuje.
-- Po akceptacji obie osoby widzą swoje treningi (tylko odczyt).

-- stałe kody kont
create table if not exists public.gym_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);
alter table public.gym_codes enable row level security;
drop policy if exists "gym_codes: własny kod" on public.gym_codes;
create policy "gym_codes: własny kod" on public.gym_codes for select to authenticated using (user_id = auth.uid());

-- połączenia: requester wysłał zaproszenie, addressee je akceptuje
create table if not exists public.gym_links (
  id bigint generated always as identity primary key,
  requester uuid not null references auth.users (id) on delete cascade,
  addressee uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester, addressee),
  check (requester <> addressee)
);
alter table public.gym_links enable row level security;
drop policy if exists "gym_links: moje" on public.gym_links;
create policy "gym_links: moje" on public.gym_links for select to authenticated using (auth.uid() in (requester, addressee));

-- czy dwa konta są połączone (zaakceptowane)
create or replace function public.gym_linked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from gym_links where status = 'accepted' and ((requester = a and addressee = b) or (requester = b and addressee = a)));
$$;

-- połączone osoby mogą czytać nawzajem swoje dane treningowe
drop policy if exists "gym_data: połączenia (odczyt)" on public.gym_data;
create policy "gym_data: połączenia (odczyt)" on public.gym_data for select to authenticated using (public.gym_linked(auth.uid(), user_id));

-- mój kod (null, jeśli jeszcze nie wygenerowany)
create or replace function public.gym_my_code() returns text
language sql stable security definer set search_path = public as $$
  select code from gym_codes where user_id = auth.uid();
$$;

-- wygeneruj kod (raz na zawsze; kolejne wywołania zwracają ten sam)
create or replace function public.gym_generate_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text; chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select code into c from gym_codes where user_id = auth.uid();
  if c is not null then return c; end if;
  loop
    c := '';
    for i in 1..6 loop c := c || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
    begin
      insert into gym_codes (user_id, code) values (auth.uid(), c);
      return c;
    exception when unique_violation then
      select code into c from gym_codes where user_id = auth.uid();
      if c is not null then return c; end if;
    end;
  end loop;
end $$;

-- wyślij zaproszenie na kod drugiej osoby
create or replace function public.gym_request_link(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare other uuid; st text;
begin
  if auth.uid() is null then raise exception 'not_logged'; end if;
  select user_id into other from gym_codes where code = upper(trim(p_code));
  if other is null then raise exception 'code_not_found'; end if;
  if other = auth.uid() then raise exception 'own_code'; end if;
  select status into st from gym_links where (requester = auth.uid() and addressee = other) or (requester = other and addressee = auth.uid());
  if st is not null then return st; end if;
  insert into gym_links (requester, addressee) values (auth.uid(), other);
  return 'pending';
end $$;

-- akceptuj / odrzuć zaproszenie (tylko adresat)
create or replace function public.gym_respond_link(p_id bigint, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_accept then update gym_links set status = 'accepted' where id = p_id and addressee = auth.uid();
  else delete from gym_links where id = p_id and addressee = auth.uid() and status = 'pending'; end if;
end $$;

-- usuń połączenie albo wycofaj zaproszenie (każda ze stron)
create or replace function public.gym_remove_link(p_id bigint) returns void
language sql security definer set search_path = public as $$
  delete from gym_links where id = p_id and auth.uid() in (requester, addressee);
$$;

-- lista moich połączeń z e-mailem drugiej osoby
-- (e-mail widać tylko przy zaproszeniu do mnie i po akceptacji; przy moim oczekującym zaproszeniu — tylko kod)
create or replace function public.gym_links_list()
returns table (id bigint, other uuid, email text, code text, status text, incoming boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id,
         case when l.requester = auth.uid() then l.addressee else l.requester end,
         case when l.status = 'accepted' or l.addressee = auth.uid() then u.email::text end,
         case when l.requester = auth.uid() then c.code end,
         l.status, l.addressee = auth.uid(), l.created_at
  from gym_links l
  join auth.users u on u.id = case when l.requester = auth.uid() then l.addressee else l.requester end
  left join gym_codes c on c.user_id = l.addressee
  where auth.uid() in (l.requester, l.addressee)
  order by l.created_at;
$$;

revoke all on function public.gym_linked(uuid, uuid) from public, anon;
grant execute on function public.gym_linked(uuid, uuid) to authenticated;
revoke all on function public.gym_my_code() from public, anon;
revoke all on function public.gym_generate_code() from public, anon;
revoke all on function public.gym_request_link(text) from public, anon;
revoke all on function public.gym_respond_link(bigint, boolean) from public, anon;
revoke all on function public.gym_remove_link(bigint) from public, anon;
revoke all on function public.gym_links_list() from public, anon;
grant execute on function public.gym_my_code(), public.gym_generate_code(), public.gym_request_link(text), public.gym_respond_link(bigint, boolean), public.gym_remove_link(bigint), public.gym_links_list() to authenticated;
