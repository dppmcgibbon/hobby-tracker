import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function BsfSpecialPage() {
  await requireAuth();

  return (
    <Card className="warhammer-card border-primary/30">
      <CardContent className="p-6 space-y-6">
        <div>
          <span className="font-bold">Wounds:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>
              Wound or grievous wound counters go in place of activation dice on
              character cards.
            </li>
            <li>Grievous wounds cannot be healed in the recovery step.</li>
          </ul>
        </div>
        <div>
          <span className="font-bold">Out of Action:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>
              If an explorer gets a wound when all activation dice spaces are
              covered by wounds or grievous wounds then the explorer is out of
              action.
            </li>
            <li>Remove miniature and initiative card.</li>
          </ul>
        </div>
        <div>
          <span className="font-bold">Inspiration:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>
              If an explorer becomes inspired, flip character card to Inspired
              and add wound and grievous wound counters.
            </li>
            <li>
              Inspired explorers stay inspired until the end of the expedition.
            </li>
            <li>Inspiration points gained by:</li>
            <ul className="ml-6 list-disc space-y-1">
              <li>Slaying enemies and rolling for inspiration.</li>
              <li>Some challenge cards.</li>
            </ul>
            <li>Character can not have more than 4 inspiration points.</li>
            <li>
              Achieving secret agenda makes explorer immediately inspired without
              using any points.
            </li>
          </ul>
        </div>
        <div>
          <span className="font-bold">Inspiration Points:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>3 - Flip to inspired side.</li>
            <li>3 - Perform a (4+) search in non discovery marker hex.</li>
            <li>2 - Attempt gambit without using activation die.</li>
            <li>1 - Re-roll an action die.</li>
          </ul>
        </div>
        <div>
          <span className="font-bold">Agility roll:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>Failure: Failure.</li>
            <li>Success: Success.</li>
            <li>Critical Success: Success.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
