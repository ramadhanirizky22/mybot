import { createClient } from "@supabase/supabase-js";
import { env } from "@/config/env";
import type { Database } from "@/types/database.types";

// Khusus digunakan di Webhook & Background Jobs (Bypass RLS dengan validasi chat_id ketat)
export const supabaseAdmin = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
