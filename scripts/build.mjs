// scripts/build.mjs
// Genera la carpeta dist/ lista para publicar: copia la app y crea js/config.js con los datos
// de Supabase tomados de variables de entorno (o de un archivo .env en local).
//
//   node scripts/build.mjs
//
// Variables: SUPABASE_URL y SUPABASE_ANON_KEY. La clave anon sigue siendo pública (el navegador
// la recibe); lo que ya no ocurre es que viva en el repositorio.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

// Lector mínimo de .env (CLAVE=valor, # comentarios, comillas opcionales)
function readEnvFile() {
  const file = join(root, ".env");
  if (!existsSync(file)) return {};

  const values = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || line.trimStart().startsWith("#")) continue;
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

function fail(message) {
  console.error(`\nError de configuración: ${message}\n`);
  process.exit(1);
}

const fileEnv = readEnvFile();
const url = (process.env.SUPABASE_URL || fileEnv.SUPABASE_URL || "").trim();
const anonKey = (process.env.SUPABASE_ANON_KEY || fileEnv.SUPABASE_ANON_KEY || "").trim();

if (!url || !anonKey) {
  fail(
    "faltan SUPABASE_URL y/o SUPABASE_ANON_KEY.\n" +
    "  En local: copia .env.example a .env y complétalo.\n" +
    "  En Vercel: Settings → Environment Variables."
  );
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
  fail(`SUPABASE_URL no parece una URL de proyecto de Supabase (https://xxxx.supabase.co): ${url}`);
}

// Una clave de servicio da acceso total y saltándose RLS: jamás debe llegar al navegador
function assertNotSecretKey(key) {
  if (key.startsWith("sb_secret_")) fail("SUPABASE_ANON_KEY es una clave secreta (sb_secret_). Usa la clave pública.");
  if (key.startsWith("sb_publishable_")) return;

  const payload = key.split(".")[1];
  if (!payload) fail("SUPABASE_ANON_KEY no tiene el formato de una clave de Supabase.");
  let role;
  try {
    role = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).role;
  } catch {
    fail("SUPABASE_ANON_KEY no se pudo leer. Revisa que esté completa.");
  }
  if (role !== "anon") {
    fail(`SUPABASE_ANON_KEY tiene el rol "${role}". Solo se permite la clave con rol "anon".`);
  }
}
assertNotSecretKey(anonKey);

// Carpeta nueva en cada build, solo con lo que la web necesita (nada de supabase/, scripts/ ni README)
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "js"), { recursive: true });

for (const entry of ["index.html", "favicon.svg", "css", "js"]) {
  cpSync(join(root, entry), join(dist, entry), { recursive: true });
}

writeFileSync(
  join(dist, "js", "config.js"),
  `// Generado por scripts/build.mjs. No se edita ni se sube al repositorio.\n` +
  `export const SUPABASE_CONFIG = ${JSON.stringify({ url, anonKey }, null, 2)};\n`
);

console.log(`dist/ listo (${url})`);
