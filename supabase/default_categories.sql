-- supabase/default_categories.sql
-- Agrega las categorías de gasto "Ahorro" y "Gasto hormiga":
--   1) a los usuarios nuevos (actualiza el trigger handle_new_user), y
--   2) a los usuarios que ya existen y todavía no tienen una parecida.
-- Se puede ejecutar varias veces: no crea duplicados.
--
-- "Ahorro" es la categoría que la app elige sola para los aportes a fondos de ahorro
-- (busca una categoría de gasto cuyo nombre contenga "ahorro").

-- 1) Usuarios nuevos: misma función que schema.sql, con las dos categorías nuevas
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

-- 2) Usuarios existentes (si ya tienes una categoría con "ahorro" u "hormiga" en el nombre, no se toca)
insert into public.categories (user_id, name, type, icon, color, is_favorite, favorite_order)
select u.id, 'Ahorro', 'expense', 'fa-piggy-bank', '#14B8A6', false, 0
from auth.users u
where not exists (
  select 1 from public.categories c
  where c.user_id = u.id and c.type = 'expense' and c.name ilike '%ahorro%'
);

insert into public.categories (user_id, name, type, icon, color, is_favorite, favorite_order)
select u.id, 'Gasto hormiga', 'expense', 'fa-cookie-bite', '#F97316', false, 0
from auth.users u
where not exists (
  select 1 from public.categories c
  where c.user_id = u.id and c.type = 'expense' and c.name ilike '%hormiga%'
);
