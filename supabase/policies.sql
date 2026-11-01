-- supabase/policies.sql
-- Aislamiento entre usuarios (RLS) e índices por usuario.
-- Se puede ejecutar varias veces. Escrito a partir de las columnas que usa el código:
-- revísalo contra tu esquema real antes de ejecutarlo en el SQL Editor de Supabase.

do $$
declare
  t text;
begin
  foreach t in array array[
    'wallets', 'categories', 'transactions', 'budgets',
    'credit_cards', 'credit_card_purchases', 'subscriptions', 'saving_goals'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)',
      t || '_owner_all', t
    );

    -- Casi todas las consultas filtran por usuario (vía RLS) y ordenan por fecha de creación
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_id_idx', t);
  end loop;
end $$;

-- Consultas más frecuentes: movimientos de un mes o de un año
create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);

create index if not exists credit_card_purchases_card_idx
  on public.credit_card_purchases (card_id);

-- El presupuesto es único por usuario y categoría (lo usa el upsert de budgetService)
create unique index if not exists budgets_user_category_key
  on public.budgets (user_id, category_id);
