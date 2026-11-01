-- supabase/indexes.sql
-- Índices para las consultas más frecuentes. Las políticas RLS filtran por user_id en cada
-- consulta, así que sin estos índices cada usuario nuevo vuelve más lenta la base para todos.
-- Se puede ejecutar varias veces.

create index if not exists wallets_user_id_idx on public.wallets (user_id);
create index if not exists categories_user_id_idx on public.categories (user_id);
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists saving_goals_user_id_idx on public.saving_goals (user_id);
create index if not exists credit_cards_user_id_idx on public.credit_cards (user_id);

-- Movimientos de un mes o de un año por usuario
create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);

-- Compras de una tarjeta; el índice de wallet_id acelera los ajustes de saldo y el borrado en cascada
create index if not exists credit_card_purchases_card_idx
  on public.credit_card_purchases (card_id);
create index if not exists transactions_wallet_idx
  on public.transactions (wallet_id);

-- budgets ya tiene un índice único (user_id, category_id) por su restricción UNIQUE
