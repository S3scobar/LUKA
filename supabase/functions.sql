-- supabase/functions.sql
-- Ajustes de saldo atómicos. La app los usa si existen; si no, cae a leer + escribir
-- (js/services/walletService.js), que puede perder una actualización cuando la misma
-- cuenta se modifica desde dos pestañas o dispositivos a la vez.
--
-- Los ids se declaran uuid: si tus tablas usan otro tipo, cambia el tipo de los parámetros.
-- Las funciones son security invoker: se aplican las políticas RLS del usuario que llama.

create or replace function public.adjust_wallet_balance(
  p_wallet_id uuid,
  p_delta numeric,
  p_max numeric default null
)
returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_balance numeric;
begin
  update public.wallets
  set balance = case
    when p_max is null then balance + p_delta
    else least(p_max, balance + p_delta)
  end
  where id = p_wallet_id
  returning balance into new_balance;

  if not found then
    raise exception 'La cuenta no existe o no te pertenece';
  end if;

  return new_balance;
end;
$$;

create or replace function public.transfer_between_wallets(
  p_from uuid,
  p_to uuid,
  p_amount numeric
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_from = p_to then
    raise exception 'La cuenta de origen y de destino no pueden ser la misma';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'El monto a transferir debe ser mayor a 0';
  end if;

  update public.wallets set balance = balance - p_amount where id = p_from;
  if not found then
    raise exception 'La cuenta de origen no existe o no te pertenece';
  end if;

  update public.wallets set balance = balance + p_amount where id = p_to;
  if not found then
    raise exception 'La cuenta de destino no existe o no te pertenece';
  end if;
end;
$$;

grant execute on function public.adjust_wallet_balance(uuid, numeric, numeric) to authenticated;
grant execute on function public.transfer_between_wallets(uuid, uuid, numeric) to authenticated;
