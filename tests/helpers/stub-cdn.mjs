// Sustituye el import de supabase-js por CDN para poder probar la lógica pura en Node, sin red.
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("https://")) return { url: "stub:cdn", shortCircuit: true };
  return next(specifier, context);
}
export async function load(url, context, next) {
  if (url === "stub:cdn") {
    return { format: "module", source: "export const createClient = () => ({});", shortCircuit: true };
  }
  return next(url, context);
}
