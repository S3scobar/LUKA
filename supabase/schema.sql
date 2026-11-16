-- LUKA — esquema de la base de datos (PostgreSQL / Supabase)
-- Referencia del esquema en producción. Se ejecuta en el SQL Editor de un proyecto nuevo, en este orden.
-- Única diferencia: purge_inactive_users está simplificada (borra solo auth.users; el resto cae por ON DELETE CASCADE).
-- Los cambios posteriores se registran en supabase/migrations/.

create extension if not exists "uuid-ossp" with schema extensions;

-- ---------------------------------------------------------------- Tablas
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  currency text default 'COP',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.wallets (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  balance numeric not null default 0.00,
  color text default '#3B82F6',
  icon text default 'fa-wallet',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.categories (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense', 'income')),
  icon text not null,
  color text default '#64748B',
  is_favorite boolean not null default false,
  favorite_order integer default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.transactions (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  category_id uuid references public.categories(id) on delete restrict,
  type text not null check (type in ('expense', 'income')),
  title text not null,
  amount numeric not null check (amount > 0),
  transaction_date date not null default current_date,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  monthly_limit numeric not null check (monthly_limit > 0),
  created_at timestamptz default now(),
  unique (user_id, category_id)
);

create table public.credit_cards (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete cascade,
  name text not null,
  credit_limit numeric not null check (credit_limit > 0),
  interest_rate_ea numeric not null default 25.00 check (interest_rate_ea >= 0),
  cutoff_day integer not null check (cutoff_day between 1 and 31),
  payment_due_day integer not null check (payment_due_day between 1 and 31),
  management_fee numeric not null default 0.00 check (management_fee >= 0),
  color text default '#8B5CF6',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.credit_card_purchases (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  transaction_id uuid,
  title text not null,
  total_amount numeric not null check (total_amount > 0),
  installments integer not null default 1 check (installments >= 1),
  installments_paid integer not null default 0 check (installments_paid >= 0),
  is_advance boolean not null default false,
  advance_fee numeric not null default 0.00,
  is_zero_interest boolean default false,
  purchase_date date not null default current_date,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.subscriptions (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  amount numeric not null check (amount > 0),
  billing_day integer not null check (billing_day between 1 and 31),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.saving_goals (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount numeric not null check (target_amount > 0),
  current_amount numeric not null default 0.00 check (current_amount >= 0),
  target_date date,
  icon text default 'fa-bullseye',
  yield_rate numeric default 0,
  last_yield_date timestamptz default now(),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.loans (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lender_type text not null default 'person' check (lender_type in ('app', 'person', 'bank')),
  principal numeric not null check (principal > 0),
  interest_rate_ea numeric not null default 0 check (interest_rate_ea >= 0),
  installments integer check (installments is null or installments > 0),
  first_due_date date,
  notes text,
  color text default '#F59E0B',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.loan_payments (
  id uuid primary key default extensions.uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount numeric not null check (amount > 0),
  payment_date date not null default current_date,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.user_phones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  phone text not null,
  provider text not null default 'google',
  created_at timestamptz default now()
);

create table public.user_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Índices
create index categories_user_id_idx              on public.categories (user_id);
create index wallets_user_id_idx                 on public.wallets (user_id);
create index transactions_user_date_idx          on public.transactions (user_id, transaction_date desc);
create index transactions_wallet_idx             on public.transactions (wallet_id);
create index transactions_category_idx           on public.transactions (category_id);
create index budgets_category_idx                on public.budgets (category_id);
create index credit_cards_user_id_idx            on public.credit_cards (user_id);
create index credit_cards_wallet_idx             on public.credit_cards (wallet_id);
create index credit_card_purchases_card_idx      on public.credit_card_purchases (card_id);
create index credit_card_purchases_category_idx  on public.credit_card_purchases (category_id);
create index credit_card_purchases_user_idx      on public.credit_card_purchases (user_id);
create index subscriptions_user_id_idx           on public.subscriptions (user_id);
create index subscriptions_category_idx          on public.subscriptions (category_id);
create index subscriptions_wallet_idx            on public.subscriptions (wallet_id);
create index saving_goals_user_id_idx            on public.saving_goals (user_id);
create index idx_loans_user                      on public.loans (user_id);
create index idx_loan_payments_loan              on public.loan_payments (loan_id);
create index idx_loan_payments_user              on public.loan_payments (user_id);
create index loan_payments_transaction_idx       on public.loan_payments (transaction_id);
create index idx_user_phones_phone               on public.user_phones (phone);

-- ---------------------------------------------------------------- Seguridad por fila (RLS)
do $$
declare t text;
begin
  foreach t in array array['profiles','wallets','categories','transactions','budgets','credit_cards',
    'credit_card_purchases','subscriptions','saving_goals','loans','loan_payments','user_phones','user_activity'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  foreach t in array array['wallets','categories','transactions','subscriptions','saving_goals','credit_cards',
    'credit_card_purchases','budgets','loans','loan_payments','user_activity'] loop
    execute format('create policy own_rows on public.%I for all to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

create policy own_rows on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy read_own on public.user_phones for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- Funciones
-- Ajustes de saldo atómicos (SECURITY INVOKER: respetan RLS)
create or replace function public.adjust_wallet_balance(p_wallet_id uuid, p_delta numeric, p_max numeric default null)
returns numeric language plpgsql set search_path = public as $$
declare new_balance numeric;
begin
  update public.wallets
     set balance = case when p_max is null then balance + p_delta else least(p_max, balance + p_delta) end
   where id = p_wallet_id
  returning balance into new_balance;
  if not found then raise exception 'La cuenta no existe o no te pertenece'; end if;
  return new_balance;
end; $$;

create or replace function public.transfer_between_wallets(p_from uuid, p_to uuid, p_amount numeric)
returns void language plpgsql set search_path = public as $$
begin
  if p_from = p_to then raise exception 'La cuenta de origen y de destino no pueden ser la misma'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'El monto a transferir debe ser mayor a 0'; end if;
  update public.wallets set balance = balance - p_amount where id = p_from;
  if not found then raise exception 'La cuenta de origen no existe o no te pertenece'; end if;
  update public.wallets set balance = balance + p_amount where id = p_to;
  if not found then raise exception 'La cuenta de destino no existe o no te pertenece'; end if;
end; $$;

-- Saldo de la billetera al crear o borrar un movimiento
create or replace function public.handle_transaction_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.wallets
       set balance = balance + case when new.type = 'income' then new.amount else -new.amount end
     where id = new.wallet_id and user_id = new.user_id;
    if not found then raise exception 'La billetera no existe o no te pertenece'; end if;
  elsif (tg_op = 'DELETE') then
    update public.wallets
       set balance = balance + case when old.type = 'expense' then old.amount else -old.amount end
     where id = old.wallet_id;
  end if;
  return null;
end; $$;

create trigger tr_transaction_balance
  after insert or delete on public.transactions
  for each row execute function public.handle_transaction_balance();

-- Teléfono vinculado: máximo 2 cuentas por número
create or replace function public.get_my_phone_status()
returns json language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_phone text;
begin
  if v_user_id is null then return json_build_object('has_phone', false, 'phone', null); end if;
  select phone into v_phone from public.user_phones where user_id = v_user_id limit 1;
  return json_build_object('has_phone', v_phone is not null, 'phone', v_phone);
end; $$;

create or replace function public.link_phone_number(p_phone text, p_provider text default 'google')
returns json language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_count int; v_clean_phone text;
begin
  if v_user_id is null then return json_build_object('success', false, 'error', 'Sesión no iniciada'); end if;
  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  if length(v_clean_phone) < 10 then
    return json_build_object('success', false, 'error', 'El número de celular debe tener al menos 10 dígitos.');
  end if;
  select count(distinct user_id) into v_count from public.user_phones
   where phone = v_clean_phone and user_id <> v_user_id;
  if v_count >= 2 then
    return json_build_object('success', false, 'error', 'Este número de celular ya está vinculado a 2 cuentas (límite máximo permitido).');
  end if;
  insert into public.user_phones (user_id, phone, provider, created_at)
  values (v_user_id, v_clean_phone, p_provider, now())
  on conflict (user_id) do update set phone = v_clean_phone, provider = p_provider;
  return json_build_object('success', true, 'phone', v_clean_phone);
end; $$;

create or replace function public.record_user_activity()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    insert into public.user_activity (user_id, last_seen_at) values (auth.uid(), now())
    on conflict (user_id) do update set last_seen_at = now();
  end if;
end; $$;

revoke execute on function public.get_my_phone_status()         from public, anon;
revoke execute on function public.link_phone_number(text, text) from public, anon;
revoke execute on function public.record_user_activity()        from public, anon;
revoke execute on function public.adjust_wallet_balance(uuid, numeric, numeric) from public, anon;
revoke execute on function public.transfer_between_wallets(uuid, uuid, numeric) from public, anon;

-- Alta de usuario: perfil, billetera y categorías iniciales
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'Usuario'));

  insert into public.wallets (user_id, name, balance, color, icon)
  values (new.id, 'Efectivo Principal', 0.00, '#10B981', 'fa-money-bill-wave');

  insert into public.categories (user_id, name, type, icon, color, is_favorite, favorite_order) values
    (new.id, 'Alimentación', 'expense', 'fa-utensils', '#F59E0B', true, 1),
    (new.id, 'Transporte', 'expense', 'fa-bus', '#3B82F6', true, 2),
    (new.id, 'Vivienda', 'expense', 'fa-house', '#8B5CF6', true, 3),
    (new.id, 'Ocio', 'expense', 'fa-gamepad', '#EC4899', true, 4),
    (new.id, 'Servicios', 'expense', 'fa-bolt', '#06B6D4', false, 0),
    (new.id, 'Salud', 'expense', 'fa-heart-pulse', '#EF4444', false, 0),
    (new.id, 'Educación', 'expense', 'fa-graduation-cap', '#10B981', false, 0),
    (new.id, 'Ahorro', 'expense', 'fa-piggy-bank', '#14B8A6', false, 0),
    (new.id, 'Gasto hormiga', 'expense', 'fa-cookie-bite', '#F97316', false, 0),
    (new.id, 'Salario', 'income', 'fa-briefcase', '#10B981', false, 0),
    (new.id, 'Inversiones', 'income', 'fa-chart-line', '#3B82F6', false, 0),
    (new.id, 'Otros Ingresos', 'income', 'fa-wallet', '#6366F1', false, 0);
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Confirma el correo al registrarse (los usuarios con celular usan un correo interno @phone.luka.app)
create or replace function public.auto_confirm_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.email_confirmed_at = now();
  return new;
end; $$;

create trigger tr_auto_confirm_user before insert on auth.users
  for each row execute function public.auto_confirm_user();

-- Limpieza de cuentas sin actividad en 2 meses. Todo cuelga de auth.users con ON DELETE CASCADE.
create or replace function public.purge_inactive_users()
returns integer language plpgsql security definer set search_path = public, auth as $$
declare v_count integer;
begin
  with gone as (
    delete from auth.users u
     using (select u2.id from auth.users u2
              left join public.user_activity ua on ua.user_id = u2.id
             where coalesce(ua.last_seen_at, u2.last_sign_in_at, u2.created_at) < now() - interval '2 months') x
     where u.id = x.id
    returning 1)
  select count(*) into v_count from gone;
  return v_count;
end; $$;

revoke execute on function public.purge_inactive_users()        from public, anon, authenticated;
revoke execute on function public.handle_new_user()             from public, anon, authenticated;
revoke execute on function public.handle_transaction_balance()  from public, anon, authenticated;
revoke execute on function public.auto_confirm_user()           from public, anon, authenticated;

-- Tarea diaria (requiere la extensión pg_cron)
-- select cron.schedule('purge-inactive-users', '0 3 * * *', 'select public.purge_inactive_users();');
