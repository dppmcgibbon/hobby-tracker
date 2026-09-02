import { createBrowserClient } from "@supabase/ssr";

function getSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(envUrl);
      // If Supabase is configured for local dev (localhost or 127.0.0.1),
      // adapt to the current hostname the client is accessing the app from (e.g. 192.168.1.65 or Hawk.local)
      if (
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        parsed.hostname = window.location.hostname;
        return parsed.toString();
      }
    } catch {
      // Fallback to envUrl if URL parsing fails
    }
  }
  return envUrl;
}

export function createClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        name: "sb-auth-token",
      },
    }
  );
}
