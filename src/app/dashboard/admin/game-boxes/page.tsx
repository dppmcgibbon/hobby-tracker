import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { GameBoxManagement } from "@/components/admin/game-box-management";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GameBoxesAdminPage() {
  await requireAuth();
  const supabase = await createClient();

  const [
    { data: rawBoxes },
    { data: universes },
    { data: games },
    { data: editions },
    { data: expansions },
  ] = await Promise.all([
    supabase
      .from("game_boxes")
      .select(
        `
        *,
        game:games!game_id(id, name, universe_id, universe:universes!universe_id(id, name)),
        edition:editions!edition_id(id, name),
        expansion:expansions!expansion_id(id, name),
        game_components(id)
      `
      )
      .order("name", { ascending: true }),
    supabase.from("universes").select("id, name").order("name"),
    supabase.from("games").select("id, name, universe_id").order("name"),
    supabase.from("editions").select("id, name, game_id").order("name"),
    supabase.from("expansions").select("id, name, edition_id").order("name"),
  ]);

  const gameBoxes = (rawBoxes || []).map((b: any) => ({
    ...b,
    game: Array.isArray(b.game) ? b.game[0] : b.game,
    edition: Array.isArray(b.edition) ? b.edition[0] : b.edition,
    expansion: Array.isArray(b.expansion) ? b.expansion[0] : b.expansion,
    component_count: Array.isArray(b.game_components) ? b.game_components.length : 0,
  }));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/admin">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-primary gold-glow">
            Game Boxes Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage physical board game boxes, editions, expansions, and storage assignments
          </p>
        </div>
      </div>

      <GameBoxManagement
        initialBoxes={gameBoxes}
        universes={universes || []}
        games={games || []}
        editions={editions || []}
        expansions={expansions || []}
      />
    </div>
  );
}
