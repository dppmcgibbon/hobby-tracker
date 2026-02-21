import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function BsfExplorationPage() {
  await requireAuth();

  return (
    <Card className="warhammer-card border-primary/30">
      <CardContent className="p-6">
        <ol className="list-decimal list-inside space-y-4">
          <li>
            <span className="font-bold">Exploration Step:</span>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
              <li>Pick the top Exploration Card.</li>
              <li>
                If card is a challenge, actions that would require Activation Dice
                in a Combat are not required during a challenge.
              </li>
              <li>If the card is a combat, set up the map.</li>
            </ul>
          </li>
          <li>
            <span className="font-bold">Recovery Step:</span>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
              <li>Recovery roll for out of action explorers:</li>
              <ul className="ml-6 list-disc space-y-1">
                <li>Roll Blackstone die.</li>
                <li>Roll &lt; number of grievous wounds, explorer dies.</li>
                <ul className="ml-6 list-disc space-y-1">
                  <li>Place Mortis card on character card.</li>
                  <li>
                    Discovery, resource or stronghold artefact cards all lost.
                  </li>
                  <li>Expedition ends.</li>
                </ul>
                <li>
                  Roll &gt; number of grievous wounds, explorer goes to Maglev.
                </li>
              </ul>
              <li>
                Vitality roll for each explorer with wounds (not grievous
                wounds):
              </li>
              <ul className="ml-6 list-disc space-y-1">
                <li>Failure: Nothing.</li>
                <li>Success: Remove 1 wound counter.</li>
                <li>Critical Success: Remove 2 wound counters.</li>
              </ul>
            </ul>
          </li>
          <li>
            <span className="font-bold">Leader Step:</span>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
              <li>Pass leader marker to next clockwise player.</li>
              <li>Players can exchange cards:</li>
              <ul className="ml-6 list-disc space-y-1">
                <li>Discovery cards.</li>
                <li>Resource cards.</li>
                <li>Stronghold artefact cards.</li>
              </ul>
              <li>End expedition check:</li>
              <ul className="ml-6 list-disc space-y-1">
                <li>If all explorers are out of action.</li>
                <li>If an explorer dies in the recovery step.</li>
                <li>If all explorers agree to end.</li>
                <li>
                  If the expedition ends, the explorers return to Precipice.
                </li>
              </ul>
            </ul>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
