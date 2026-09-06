// js/services/categoryService.js
import { supabase } from "../supabaseClient.js";

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          user_id: user.id,
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuario no autenticado");

    const { error: resetError } = await supabase
      .from("categories")
      .update({ is_favorite: false, favorite_order: 0 })
      .eq("user_id", user.id)
      .eq("type", "expense");

    if (resetError) throw resetError;

    for (let index = 0; index < favoriteIds.length; index++) {
      const categoryId = favoriteIds[index];
      const { error: updateError } = await supabase
        .from("categories")
        .update({
          is_favorite: true,
          favorite_order: index + 1
        })
        .eq("id", categoryId);

      if (updateError) throw updateError;
    }

    return true;
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