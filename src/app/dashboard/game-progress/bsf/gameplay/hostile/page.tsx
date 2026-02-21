import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";
import { ClickableImage } from "@/components/game-progress/clickable-image";

const IMAGE_BASE = "/game-progress/bsf/images";

export default async function BsfHostilePage() {
  await requireAuth();

  return (
    <Card className="warhammer-card border-primary/30">
      <CardContent className="p-6 space-y-6">
        <div>
          <span className="font-bold">Reinforcement Roll:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>Roll Blackstone die</li>
            <li>
              Reinforcements return at hex adjacent to a portal closest to
              hostiles
            </li>
            <li>
              Reinforcement attacks closest explorer or moves towards closest
              explorer if none at visible
            </li>
          </ul>
          <div className="mt-2">
            <ClickableImage
              src={`${IMAGE_BASE}/gameplay/reinforcements.png`}
              alt="Reinforcements"
              className="relative w-64 h-32 border border-primary/30 rounded"
            />
          </div>
        </div>

        <div>
          <span className="font-bold">Hostile actions:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>Roll Blackstone die for Behaviour Roll</li>
            <li>Lookup action reference on hostile reference card</li>
          </ul>
        </div>

        <div>
          <span className="font-bold">Hostile attack:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>Based on weapon on the model and the reference card</li>
          </ul>
        </div>

        <div>
          <span className="font-bold">Explorer defence roll:</span>
          <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
            <li>
              If a wound or grievous wound suffered, explorer can roll defence
            </li>
            <li>Defence dice shown on character card</li>
            <li>Failure: Apply wound or grievous wound</li>
            <li>Success: Wound negated or grievous wound becomes wound</li>
            <li>Critical Success: Wound or grievous wound negated</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
