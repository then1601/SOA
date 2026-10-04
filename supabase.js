require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

if (!supabaseUrl || !supabasePublishableKey ||
    /replace_with_your_project_key|put-your-supabase-publishable-key-here/i.test(supabasePublishableKey)) {
  throw new Error(
    "Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in the project .env file."
  );
}

try {
  const parsedUrl = new URL(supabaseUrl);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Unsupported URL protocol");
  }
} catch {
  throw new Error("SUPABASE_URL in .env must be a valid HTTP or HTTPS URL");
}

module.exports = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false
  }
});
