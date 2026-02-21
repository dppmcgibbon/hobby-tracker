import { requireAuth } from "@/lib/auth/server";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { BsfPlayerTabs } from "@/components/game-progress/bsf-player-tabs";
import { ClickableImage } from "@/components/game-progress/clickable-image";

const PLAYER_DATA: Record<
  string,
  {
    tokens: string[];
    explorer: string;
    cards: string[];
    ships: [string, string] | null;
    stronghold?: string[];
  }
> = {
  daithi: {
    tokens: ["inspiration.png", "wound.png"],
    explorer: "janus_draik_standard.png",
    cards: ["arch1.png", "cron.png", "clue.png"],
    ships: ["van_fac.jpg", "van_sup.jpg"],
  },
  dee: {
    tokens: ["inspiration.png", "wound.png", "grevious.png", "grevious.png"],
    explorer: "amallyn_shadowguide_standard.png",
    cards: ["arch1.png", "fall.png"],
    ships: ["steed_fac.jpg", "steed_sup.jpg"],
  },
  ian: {
    tokens: ["wound.png", "grevious.png"],
    explorer: "ur025_inspired.png",
    cards: ["arch1.png", "arch1.png", "arch1.png"],
    ships: ["gamma_fac.jpg", "gamma_sup.jpg"],
  },
  paul: {
    tokens: ["wound.png", "wound.png", "grevious.png"],
    explorer: "taddeus_standard.png",
    cards: ["arch1.png", "arch1.png", "arch1.png"],
    ships: ["clar_fac.jpg", "clar_sup.jpg"],
  },
  stronghold: {
    tokens: [],
    explorer: "",
    cards: [],
    ships: null,
    stronghold: ["000.jpg", "001.jpg", "002.jpg", "003.jpg", "004.jpg", "005.jpg"],
  },
};

const VALID_PLAYERS = ["daithi", "dee", "ian", "paul", "stronghold"] as const;

const IMAGE_BASE = "/game-progress/bsf/images";

export default async function BsfPlayerPage({
  params,
}: {
  params: Promise<{ player: string }>;
}) {
  await requireAuth();
  const { player } = await params;
  if (!VALID_PLAYERS.includes(player as (typeof VALID_PLAYERS)[number])) {
    notFound();
  }

  const data = PLAYER_DATA[player];

  return (
    <>
      <BsfPlayerTabs />
      <Card className="warhammer-card border-primary/30">
        <CardContent className="p-6 space-y-6">
          {data.tokens.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {data.tokens.map((name, i) => (
                <ClickableImage
                  key={`token-${i}-${name}`}
                  src={`${IMAGE_BASE}/tokens/${name}`}
                  className="relative w-16 h-16"
                />
              ))}
            </div>
          )}
          {data.explorer && (
            <ClickableImage
              src={`${IMAGE_BASE}/explorers/${data.explorer}`}
              alt="Explorer"
              className="relative w-full max-w-xs aspect-[3/4]"
            />
          )}
          {data.cards.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {data.cards.map((name, i) => (
                <ClickableImage
                  key={`card-${i}-${name}`}
                  src={`${IMAGE_BASE}/cards/${name}`}
                  className="relative w-24 h-32"
                />
              ))}
            </div>
          )}
          {data.ships && (
            <div className="flex flex-wrap gap-4">
              {data.ships.map((name, i) => (
                <ClickableImage
                  key={`ship-${i}-${name}`}
                  src={`${IMAGE_BASE}/ships/${name}`}
                  className="relative w-64 h-40"
                />
              ))}
            </div>
          )}
          {data.stronghold && data.stronghold.length > 0 && (
            <div className="space-y-4">
              {data.stronghold.map((name) => (
                <ClickableImage
                  key={name}
                  src={`${IMAGE_BASE}/stronghold/${name}`}
                  className="relative w-full max-w-md aspect-video"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
