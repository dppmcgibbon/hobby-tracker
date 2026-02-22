import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Shield } from "lucide-react";

// Map legion name to logo filename in /public/legions/
function getLegionLogoPath(name: string): string | null {
  const mapping: Record<string, string> = {
    "Dark Angels": "DarkAngels",
    "Emperor's Children": "EmperorsChildren",
    "Iron Warriors": "IronWarriors",
    "Imperial Fists": "ImperialFists",
    "White Scars": "WhiteScars",
    "Space Wolves": "SpaceWolves",
    "Night Lords": "NightLords",
    "Blood Angels": "BloodAngels",
    "Iron Hands": "IronHands",
    "World Eaters": "WorldEaters",
    "Ultramarines": "Ultramarines",
    "Death Guard": "DeathGuard",
    "Thousand Sons": "ThousandSons",
    "Black Legion": "SonsOfHorus",
    "Word Bearers": "WordBearers",
    "Salamanders": "Salamanders",
    "Raven Guard": "RavenGuard",
    "Alpha Legion": "AlphaLegion",
  };
  const filename = mapping[name];
  return filename ? `/legions/${filename}.webp` : null;
}

// 18 Space Marine Legions (II and XI were lost/expunged) in canonical order
const LEGION_NAMES = [
  "Dark Angels",      // I
  "Emperor's Children", // III
  "Iron Warriors",    // IV
  "Imperial Fists",   // V
  "White Scars",      // VI
  "Space Wolves",     // VII
  "Night Lords",      // VIII
  "Blood Angels",     // IX
  "Iron Hands",       // X
  "World Eaters",     // XII
  "Ultramarines",     // XIII
  "Death Guard",      // XIV
  "Thousand Sons",    // XV
  "Black Legion",     // XVI (successors of Luna Wolves / Sons of Horus)
  "Word Bearers",     // XVII
  "Salamanders",      // XVIII
  "Raven Guard",      // XIX
  "Alpha Legion",     // XX
];

const ROMAN_NUMERALS = [
  "I", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
];

export default async function LegionsPage() {
  await requireAuth();
  const supabase = await createClient();

  const { data: factions } = await supabase
    .from("factions")
    .select("id, name, color_hex")
    .in("name", LEGION_NAMES);

  const factionByName = new Map(
    (factions || []).map((f) => [f.name, f])
  );

  return (
    <div className="space-y-8">
      <div className="border-l-4 border-primary pl-4">
        <h1 className="text-4xl font-black uppercase tracking-wider text-primary gold-glow">
          Legions
        </h1>
        <p className="text-muted-foreground mt-2">
          The 18 original Space Marine Legions. Select a legion to view miniatures of that faction.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {LEGION_NAMES.map((name, index) => {
          const faction = factionByName.get(name);
          const numeral = ROMAN_NUMERALS[index];
          const href = faction
            ? `/dashboard/miniatures?faction=${faction.id}`
            : `/dashboard/miniatures?search=${encodeURIComponent(name)}`;
          const color = faction?.color_hex || "#6b7280";
          const logoPath = getLegionLogoPath(name);

          return (
            <Link key={name} href={href}>
              <Card className="warhammer-card border-primary/30 hover:border-primary/60 transition-all overflow-hidden group h-full">
                <CardHeader className="p-4 pb-0">
                  <div
                    className="w-full aspect-square rounded-lg flex items-center justify-center border-2 border-primary/30 group-hover:border-primary/60 transition-colors overflow-hidden p-2"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    {logoPath ? (
                      <Image
                        src={logoPath}
                        alt={name}
                        width={128}
                        height={128}
                        className="object-contain w-full h-full"
                      />
                    ) : (
                      <Shield
                        className="h-12 w-12 sm:h-14 sm:w-14 opacity-90"
                        style={{ color }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground tracking-wider mt-1 block">
                    {numeral}
                  </span>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <p className="font-bold text-sm uppercase tracking-wide text-center leading-tight line-clamp-2">
                    {name}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
