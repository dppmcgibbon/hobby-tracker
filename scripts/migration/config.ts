import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase credentials in environment variables");
}

// Create admin client with service role key
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const config = {
  supabaseUrl,
  batchSize: 100, // Number of records to insert at once
};