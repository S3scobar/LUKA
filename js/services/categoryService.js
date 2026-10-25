// js/services/categoryService.js
import { supabase, requireUserId } from "../supabaseClient.js";

export const categoryService = {
  // Obtener categorías
  async getCategories(type = null) {
    let query = supabase
      .from("categories")
      .select("*")
      .order("is_favorite", { ascending: false })
      .order("favorite_order", { ascending: true })
      .order("name", { ascending: true });

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Crear categoría
  async createCategory({ name, type = "expense", icon = "fa-tag", color = "#64748B" }) {
    const userId = await requireUserId();

    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          user_id: userId,
          name: name.trim(),
          type,
          icon,
          color,
          is_favorite: false,
          favorite_order: 0
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar categoría (NUEVO)
  async updateCategory(id, { name, icon, color }) {
    const { data, error } = await supabase
      .from("categories")
      .update({
        name: name.trim(),
        icon,
        color
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Configurar las 4 favoritas
  async setFavoriteCategories(favoriteIds) {
    if (!Array.isArray(favoriteIds) || favoriteIds.length > 4) {
      throw new Error("Debes seleccionar un máximo de 4 categorías favoritas");
    }

    const userId = await requireUserId();

    const { error: resetError } = await supabase
      .from("categories")
      .update({ is_favorite: false, favorite_order: 0 })
      .eq("user_id", userId)
      .eq("type", "expense");

    if (resetError) throw resetError;

    // Las actualizaciones son independientes entre sí: se envían en paralelo
    const results = await Promise.all(
      favoriteIds.map((categoryId, index) =>
        supabase
          .from("categories")
          .update({ is_favorite: true, favorite_order: index + 1 })
          .eq("id", categoryId)
      )
    );

    const failed = results.find(r => r.error);
    if (failed) throw failed.error;

    return true;
  },

  // Busca el id de una categoría del usuario según su tipo.
  // Si se indica namePattern (ej. "%ahorro%") se prefiere esa coincidencia;
  // si no existe, se usa la primera categoría de ese tipo.
  async resolveCategoryId(userId, type, namePattern = null) {
    if (namePattern) {
      const { data: match } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", userId)
        .eq("type", type)
        .ilike("name", namePattern)
        .limit(1)
        .maybeSingle();

      if (match) return match.id;
    }

    const { data: fallback } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .eq("type", type)
      .limit(1)
      .maybeSingle();

    return fallback ? fallback.id : null;
  },

  // Eliminar categoría
  async deleteCategory(id) {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      if (error.code === "23503" || error.message.includes("foreign key")) {
        throw new Error("No puedes eliminar esta categoría porque ya tiene gastos o ingresos registrados. Puedes editarla en su lugar.");
      }
      throw error;
    }
    return true;
  }
};