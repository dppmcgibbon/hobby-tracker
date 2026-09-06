import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChevronRight, ArrowLeft, Bookmark } from "lucide-react";
import { ShortcutManagement } from "@/components/admin/shortcuts/shortcut-management";

export const dynamic = "force-dynamic";

export default async function AdminShortcutsPage() {
  await requireAuth();
  const supabase = await createClient();

  const [
    { data: shortcuts },
    { data: universes },
    { data: games },
    { data: editions },
    { data: expansions },
  ] = await Promise.all([
    supabase.from("saved_filters").select("*").order("name"),
    supabase.from("universes").select("id, name").order("name"),
    supabase.from("games").select("id, name, universe_id").order("name"),
    supabase.from("editions").select("id, name, game_id, year").order("sequence"),
    supabase.from("expansions").select("id, name, edition_id, sequence").order("sequence"),
  ]);

  return (
    <div className="space-y-6 max-w-full">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
          Admin
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
        <span className="text-primary">Shortcuts</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-l-4 border-primary pl-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-wider text-primary gold-glow flex items-center gap-3">
            <Bookmark className="h-8 w-8 text-primary" />
            Shortcuts Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Create, edit, and manage game shortcuts and transparent logos
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="text-xs uppercase font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Link>
      </div>

      {/* Management Component */}
      <ShortcutManagement
        shortcuts={shortcuts || []}
        universes={universes || []}
        games={games || []}
        editions={editions || []}
        expansions={expansions || []}
      />
    </div>
  );
}
