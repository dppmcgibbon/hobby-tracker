import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { GameComponentManagement } from "@/components/admin/game-component-management";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface GameComponentsAdminPageProps {
  searchParams: Promise<{
    box?: string;
  }>;
}

export default async function GameComponentsAdminPage({
  searchParams,
}: GameComponentsAdminPageProps) {
  await requireAuth();
  const resolvedSearchParams = await searchParams;
  const initialBoxId = resolvedSearchParams?.box || undefined;

  const supabase = await createClient();

  const [{ data: rawComponents }, { data: allBoxes }] = await Promise.all([
    supabase
      .from("game_components")
      .select(
        `
        *,
        game_box:game_boxes!game_box_id(
          id,
          name,
          game_id,
          edition_id,
          expansion_id,
          game:games!game_id(id, name, universe_id, universe:universes!universe_id(id, name)),
          edition:editions!edition_id(id, name),
          expansion:expansions!expansion_id(id, name)
        )
      `
      )
      .order("name", { ascending: true }),
    supabase
      .from("game_boxes")
      .select(
        `
        id,
        name,
        game_id,
        game:games!game_id(id, name)
      `
      )
      .order("name", { ascending: true }),
  ]);

  const components = (rawComponents || []).map((c: any) => {
    const rawBox = Array.isArray(c.game_box) ? c.game_box[0] : c.game_box;
    const game = rawBox ? (Array.isArray(rawBox.game) ? rawBox.game[0] : rawBox.game) : null;
    const universe = game
      ? Array.isArray(game.universe)
        ? game.universe[0]
        : game.universe
      : null;
    const edition = rawBox
      ? Array.isArray(rawBox.edition)
        ? rawBox.edition[0]
        : rawBox.edition
      : null;
    const expansion = rawBox
      ? Array.isArray(rawBox.expansion)
        ? rawBox.expansion[0]
        : rawBox.expansion
      : null;

    return {
      ...c,
      game_box: rawBox
        ? {
            id: rawBox.id,
            name: rawBox.name,
            game_id: rawBox.game_id,
            edition_id: rawBox.edition_id,
            expansion_id: rawBox.expansion_id,
            game: game
              ? { id: game.id, name: game.name, universe_id: game.universe_id, universe }
              : null,
            edition,
            expansion,
          }
        : null,
    };
  });

  const formattedBoxes = (allBoxes || []).map((b: any) => ({
    id: b.id,
    name: b.name,
    game_id: b.game_id,
    game_name: (Array.isArray(b.game) ? b.game[0]?.name : b.game?.name) || "Unknown Game",
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
            Game Components Management
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage components, tokens, cards, dice, missing parts, and component images
          </p>
        </div>
      </div>

      <GameComponentManagement
        initialComponents={components}
        allBoxes={formattedBoxes}
        initialBoxFilter={initialBoxId}
      />
    </div>
  );
}
