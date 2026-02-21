import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function BsfExplorerPage() {
  await requireAuth();

  return (
    <Card className="warhammer-card border-primary/30">
      <CardContent className="p-6 space-y-6">
        <p className="text-muted-foreground">
          Explorers can spend activation dice to make actions or dice can be
          saved for overwatch attacks. Explorer can also make an inspiration
          roll if they have killed any hostiles.
        </p>
        <p className="text-muted-foreground">
          Destiny dice can be used instead of activation dice, no more than 2
          per explorer per round.
        </p>

        <div>
          <span className="font-bold">Basic Explorer actions:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>Move (1+)</li>
            <li>
              Recuperate (1+)
              <ul className="ml-6 list-disc">
                <li>Make vitality roll for wounds only</li>
                <li>Failure: Nothing</li>
                <li>Success: Remove 1 wound counter</li>
                <li>Critical Success: Remove 2 wound counters</li>
              </ul>
            </li>
            <li>
              Search (4+)
              <ul className="ml-6 list-disc">
                <li>
                  Only if in a Hex with a Discovery marker or if 3 inspiration
                  points are spent
                </li>
                <li>Can&apos;t be adjacent to a visible hostile</li>
                <li>Remove Discovery marker and draw from Discovery Deck</li>
              </ul>
            </li>
            <li>
              Summon (4+)
              <ul className="ml-6 list-disc">
                <li>If in a hex adjacent to a portal</li>
                <li>Replace portal with Maglev</li>
              </ul>
            </li>
          </ul>
        </div>

        <div>
          <span className="font-bold">Special Explorer actions:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>
              Weapon Actions:
              <ul className="ml-6 list-disc">
                <li>Spend Activation Dice</li>
                <li>Cost determined by character reference card</li>
              </ul>
            </li>
            <li>
              Aiming (1+)
              <ul className="ml-6 list-disc">
                <li>Ignores cover</li>
              </ul>
            </li>
            <li>Unique actions on character card</li>
          </ul>
        </div>

        <div>
          <span className="font-bold">Overwatch:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>Left over dice can be used for overwatch</li>
            <li>Remove any dice with a 1</li>
            <li>Reduce all other dice value by 1</li>
            <li>
              Explorer can then take a weapon action after a hostile move/attack
            </li>
            <li>That hostile must be the target</li>
            <li>Must have already been activated to perform overwatch</li>
          </ul>
        </div>

        <div>
          <span className="font-bold">Inspiration Roll:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>If the explorer killed any hostiles (not overwatch)</li>
            <li>Roll Blackstone die</li>
            <li>
              Roll &lt;= number of wounds of slain hostiles, 1 inspiration
              point
            </li>
            <li>If more than 20 wounds, automatic inspiration point</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
