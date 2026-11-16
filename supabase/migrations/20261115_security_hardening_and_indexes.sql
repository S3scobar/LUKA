-- Aplicada en producción el 2026-11-15 (proyecto "Manager"). Se guarda aquí como registro.
-- 1) Funciones internas: fuera de la API pública. purge_inactive_users borra cuentas; el cron corre como postgres.
revoke execute on function public.purge_inactive_users()       from public, anon, authenticated;
revoke execute on function public.handle_new_user()            from public, anon, authenticated;
revoke execute on function public.handle_transaction_balance() from public, anon, authenticated;
revoke execute on function public.auto_confirm_user()          from public, anon, authenticated;
revoke execute on function public.get_my_phone_status()        from public, anon;
revoke execute on function public.link_phone_number(text, text) from public, anon;
revoke execute on function public.record_user_activity()       from public, anon;
revoke execute on function public.adjust_wallet_balance(uuid, numeric, numeric) from public, anon;
revoke execute on function public.transfer_between_wallets(uuid, uuid, numeric) from public, anon;

-- 2) search_path fijo
alter function public.auto_confirm_user() set search_path = public;
alter function public.handle_new_user()   set search_path = public;

-- 3) El disparador de saldo no toca billeteras de otro usuario
create or replace function public.handle_transaction_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.wallets
       set balance = balance + case when new.type = 'income' then new.amount else -new.amount end
     where id = new.wallet_id and user_id = new.user_id;
    if not found then
      raise exception 'La billetera no existe o no te pertenece';
    end if;
  elsif (tg_op = 'DELETE') then
    update public.wallets
       set balance = balance + case when old.type = 'expense' then old.amount else -old.amount end
     where id = old.wallet_id;
  end if;
  return null;
end;
$$;

-- 4) RLS: rol authenticated, auth.uid() evaluado una vez, WITH CHECK explícito
do $$
declare t text; p record;
begin
  foreach t in array array['wallets','categories','transactions','subscriptions','saving_goals','credit_cards',
                           'credit_card_purchases','budgets','loans','loan_payments','user_activity'] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('create policy own_rows on public.%I for all to authenticated
                    using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy %I on public.profiles', p.policyname);
  end loop;
  create policy own_rows on public.profiles for all to authenticated
    using (id = (select auth.uid())) with check (id = (select auth.uid()));
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'user_phones' loop
    execute format('drop policy %I on public.user_phones', p.policyname);
  end loop;
  create policy read_own on public.user_phones for select to authenticated
    using (user_id = (select auth.uid()));
end $$;

-- 5) Índices en llaves foráneas
create index if not exists budgets_category_idx               on public.budgets (category_id);
create index if not exists credit_card_purchases_category_idx on public.credit_card_purchases (category_id);
create index if not exists credit_card_purchases_user_idx     on public.credit_card_purchases (user_id);
create index if not exists credit_cards_wallet_idx            on public.credit_cards (wallet_id);
create index if not exists loan_payments_transaction_idx      on public.loan_payments (transaction_id);
create index if not exists subscriptions_category_idx         on public.subscriptions (category_id);
create index if not exists subscriptions_wallet_idx           on public.subscriptions (wallet_id);
create index if not exists transactions_category_idx          on public.transactions (category_id);
