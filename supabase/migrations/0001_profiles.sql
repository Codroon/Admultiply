-- Accounts, and what an account owns.
--
-- Supabase keeps identity in auth.users, which we do not own and cannot add
-- columns to. Everything the product needs about a person lives here instead,
-- keyed by the same id, created automatically the moment they sign up.
--
-- Run once, in the Supabase dashboard under SQL Editor. Safe to run again:
-- every statement is written to be idempotent.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  plan        text not null default 'free',
  -- Three tokens on the house, the same as the demo gave. The ledger that
  -- replaces this lands with billing; a plain balance is enough until money
  -- is involved, and it cannot drift because only the function below moves it.
  tokens      integer not null default 3 check (tokens >= 0),
  -- The admin area reads this and nothing else. 'user' for everyone until
  -- someone is promoted by hand in the SQL editor, which is the right amount
  -- of ceremony for a role that can see every customer's billing.
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- For a project where the table already exists from an earlier run.
alter table public.profiles
  add column if not exists role text not null default 'user';

alter table public.profiles enable row level security;

-- A person may read and change their own row, and nobody else's. The anon key
-- is public by design, so this is what actually protects the data.
drop policy if exists "profiles are readable by their owner" on public.profiles;
create policy "profiles are readable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles are updatable by their owner" on public.profiles;
create policy "profiles are updatable by their owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Row level security says which rows; these grants say which columns, and
-- without them owning your row would mean being able to write any value in
-- it. The anon key ships in the browser, so anyone could call PostgREST
-- directly and set tokens to a thousand or role to 'admin'. Tokens move only
-- through the two functions below, which run as the definer and ignore these
-- grants. Role moves only by hand.
revoke update on public.profiles from authenticated;
-- Plan is here because switching plans is still how the product is tried
-- before Stripe exists. When billing lands, drop plan from this list and let
-- the webhook be the only thing that writes it.
grant update (full_name, plan) on public.profiles to authenticated;

-- ------------------------------------------------------- profile on signup
-- A trigger rather than application code on purpose: it fires for every route
-- into the product, password, magic link and Google alike, so there is no path
-- that creates a user without the profile that gives them their tokens.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ spending one
-- Spending happens in the database, not the browser, so a refresh cannot undo
-- it and a determined visitor cannot award themselves more. The check and the
-- decrement are one statement, which is what stops two tabs spending the same
-- last token.
create or replace function public.spend_token()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  update public.profiles
     set tokens = tokens - 1, updated_at = now()
   where id = auth.uid() and tokens > 0
  returning tokens into remaining;

  if remaining is null then
    raise exception 'no tokens remaining' using errcode = 'P0001';
  end if;
  return remaining;
end;
$$;

-- Giving one back when a job fails, so a crash never costs the customer.
create or replace function public.refund_token()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  update public.profiles
     set tokens = tokens + 1, updated_at = now()
   where id = auth.uid()
  returning tokens into remaining;
  return remaining;
end;
$$;

revoke all on function public.spend_token() from public;
revoke all on function public.refund_token() from public;
grant execute on function public.spend_token() to authenticated;
grant execute on function public.refund_token() to authenticated;

-- --------------------------------------------- anyone already signed up
-- Backfill, so accounts created before this ran are not left without a
-- profile and therefore without tokens.
insert into public.profiles (id, email, full_name)
select u.id,
       u.email,
       coalesce(
         u.raw_user_meta_data ->> 'full_name',
         u.raw_user_meta_data ->> 'name',
         split_part(coalesce(u.email, ''), '@', 1)
       )
  from auth.users u
  left join public.profiles p on p.id = u.id
 where p.id is null;
