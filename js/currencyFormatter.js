// js/currencyFormatter.js

// Convierte cualquier input a formato de moneda en tiempo real
export function attachCurrencyInput(inputElement, onValueChange = null) {
  if (!inputElement) return;
  inputElement.type = "text";
  inputElement.inputMode = "numeric";
  inputElement.autocomplete = "off";

  // Si ya tiene un valor inicial, formatearlo de inmediato
  const initialRaw = String(inputElement.value || "").replace(/\D/g, "");
  if (initialRaw && !isNaN(Number(initialRaw)) && Number(initialRaw) > 0) {
    inputElement.value = Number(initialRaw).toLocaleString("es-CO");
  }

  inputElement.addEventListener("input", (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      e.target.value = "";
      if (onValueChange) onValueChange(0);
      return;
    }
    e.target.value = Number(raw).toLocaleString("es-CO");
    if (onValueChange) onValueChange(Number(raw));
  });
}

// Extrae el número puro para guardar en Supabase sin puntos ni comas
export function parseCurrencyInput(value) {
  if (!value) return 0;
  const raw = String(value).replace(/\D/g, "");
  return parseFloat(raw) || 0;
}