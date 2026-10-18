const { createClient } = require("@supabase/supabase-js");

function createProductsStore(accessToken) {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    }
  );

  async function unwrap(query) {
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return data;
  }

  return {
    list() {
      return unwrap(client.from("products").select("*").order("id"));
    },

    findById(id) {
      return unwrap(client.from("products").select("*").eq("id", id).maybeSingle());
    },

    create(product) {
      return unwrap(client.from("products").insert(product).select("*").single());
    },

    update(id, product) {
      return unwrap(
        client.from("products")
          .update({ ...product, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select("*")
          .maybeSingle()
      );
    },

    delete(id) {
      return unwrap(
        client.from("products").delete().eq("id", id).select("id").maybeSingle()
      ).then((product) => product !== null);
    }
  };
}

module.exports = { createProductsStore };
