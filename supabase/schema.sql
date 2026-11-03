-- supabase/schema.sql
-- Esquema actual de LUKA, reunido en orden de ejecución a partir de las consultas que se
-- fueron corriendo en el SQL Editor. Sirve como referencia y para crear un proyecto nuevo.
-- Es repetible (IF NOT EXISTS / DROP ... IF EXISTS), pero no lo ejecutes sobre una base con
-- datos sin revisarlo antes: los triggers y las políticas se vuelven a crear.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  currency text default 'COP',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Cuentas de dinero. La billetera de una tarjeta de crédito guarda el cupo disponible.
create table if not exists public.wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  balance numeric(15, 2) default 0.00 not null,
  color text default '#3B82F6',
  icon text default 'fa-wallet',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text check (type in ('expense', 'income')) not null,
  icon text not null,
  color text default '#64748B',
  is_favorite boolean default false not null,
  favorite_order int default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- category_id admite nulo: los avances de tarjeta se registran sin categoría.
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  category_id uuid references public.categories(id) on delete restrict,
  type text check (type in ('expense', 'income')) not null,
  title text not null,
  amount numeric(15, 2) not null check (amount > 0),
  transaction_date date default current_date not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  amount numeric(15, 2) not null check (amount > 0),
  billing_day int not null check (billing_day between 1 and 31),
  is_active boolean default true not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.saving_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount numeric(15, 2) not null check (target_amount > 0),
  current_amount numeric(15, 2) default 0.00 not null check (current_amount >= 0),
  target_date date,
  icon text default 'fa-bullseye',
  yield_rate numeric default 0,
  last_yield_date timestamptz default now(),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.credit_cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid references public.wallets(id) on delete cascade,
  name text not null,
  credit_limit numeric(15, 2) not null check (credit_limit > 0),
  interest_rate_ea numeric(5, 2) not null default 25.00 check (interest_rate_ea >= 0),
  cutoff_day int not null check (cutoff_day between 1 and 31),
  payment_due_day int not null check (payment_due_day between 1 and 31),
  management_fee numeric(15, 2) default 0.00 not null check (management_fee >= 0),
  color text default '#8B5CF6',
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.credit_card_purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  total_amount numeric(15, 2) not null check (total_amount > 0),
  installments int not null default 1 check (installments >= 1),
  installments_paid int not null default 0 check (installments_paid >= 0),
  is_advance boolean default false not null,
  advance_fee numeric(15, 2) default 0.00 not null,
  is_zero_interest boolean default false,
  transaction_id uuid,
  purchase_date date default current_date not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  monthly_limit numeric not null check (monthly_limit > 0),
  created_at timestamptz default now(),
  unique (user_id, category_id)
);

-- ---------------------------------------------------------------------------
-- Seguridad por fila: cada usuario solo ve y modifica lo suyo
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.saving_goals enable row level security;
alter table public.credit_cards enable row level security;
alter table public.credit_card_purchases enable row level security;
alter table public.budgets enable row level security;

drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can manage own profile" on public.profiles
  for all using (auth.uid() = id);

drop policy if exists "Users can manage own wallets" on public.wallets;
create policy "Users can manage own wallets" on public.wallets
  for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own categories" on public.categories;
create policy "Users can manage own categories" on public.categories
  for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own transactions" on public.transactions;
create policy "Users can manage own transactions" on public.transactions
  for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own subscriptions" on public.subscriptions;
create policy "Users can manage own subscriptions" on public.subscriptions
  for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own saving goals" on public.saving_goals;
create policy "Users can manage own saving goals" on public.saving_goals
  for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own credit cards" on public.credit_cards;
create policy "Users can manage own credit cards" on public.credit_cards
  for all using (auth.uid() = user_id);

drop policy if exists "Users can manage own credit card purchases" on public.credit_card_purchases;
create policy "Users can manage own credit card purchases" on public.credit_card_purchases
  for all using (auth.uid() = user_id);

drop policy if exists "Los usuarios pueden gestionar sus propios presupuestos" on public.budgets;
create policy "Los usuarios pueden gestionar sus propios presupuestos" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- El saldo de la billetera se ajusta solo al crear o borrar una transacción.
-- Por eso el código no debe tocar el saldo a mano cuando además registra una transacción.
create or replace function public.handle_transaction_balance()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    if (new.type = 'expense') then
      update public.wallets set balance = balance - new.amount where id = new.wallet_id;
    elsif (new.type = 'income') then
      update public.wallets set balance = balance + new.amount where id = new.wallet_id;
    end if;
  elsif (tg_op = 'DELETE') then
    if (old.type = 'expense') then
      update public.wallets set balance = balance + old.amount where id = old.wallet_id;
    elsif (old.type = 'income') then
      update public.wallets set balance = balance - old.amount where id = old.wallet_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_transaction_balance on public.transactions;
create trigger tr_transaction_balance
  after insert or delete on public.transactions
  for each row execute function public.handle_transaction_balance();

-- Datos iniciales de cada usuario nuevo: perfil, una billetera y categorías básicas
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'Usuario'));

  insert into public.wallets (user_id, name, balance, color, icon)
  values (new.id, 'Efectivo Principal', 0.00, '#10B981', 'fa-money-bill-wave');

  insert into public.categories (user_id, name, type, icon, color, is_favorite, favorite_order)
  values
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
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Confirma el correo al registrarse (no se envía ni se exige verificación de correo).
create or replace function public.auto_confirm_user()
returns trigger as $$
begin
  new.email_confirmed_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_auto_confirm_user on auth.users;
create trigger tr_auto_confirm_user
  before insert on auth.users
  for each row execute function public.auto_confirm_user();
