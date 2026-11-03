import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_CONFIG } from "./config.js";

export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);

// Devuelve el id del usuario autenticado leyendo la sesión local.
// A diferencia de supabase.auth.getUser(), no hace una petición de red en cada llamada;
// la autorización real la imponen las políticas RLS de la base de datos.
export async function requireUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Usuario no autenticado");
  return session.user.id;
}

// PostgREST responde con estos códigos cuando una función RPC no está desplegada
export function isMissingRpc(error) {
  return error?.code === "PGRST202" || error?.code === "42883";
}
