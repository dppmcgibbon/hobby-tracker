import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";
import { ClickableImage } from "@/components/game-progress/clickable-image";

const IMAGE_BASE = "/game-progress/bsf/images";

export default async function BsfCombatPage() {
  await requireAuth();

  return (
    <Card className="warhammer-card border-primary/30">
      <CardContent className="p-6 space-y-6">
        <ol className="list-decimal list-inside space-y-4">
          <li>
            <span className="font-bold">
              Place chambers, location tiles, portals, discovery markers, maglev
              and ambush hexes.
            </span>
          </li>
          <li>
            <span className="font-bold">Deploy Hostiles:</span>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
              <li>Draw cards from the Encounter Deck and place on Combat Track.</li>
              <li>Deploy in the hex with Discovery marker and adjacent hexes.</li>
              <li>Refer to Hex Limits table.</li>
              <li>Deploy in cover as much as possible.</li>
              <li>Set out hostile reference cards.</li>
            </ul>
            <div className="mt-2">
              <ClickableImage
                src={`${IMAGE_BASE}/gameplay/hex_limits.png`}
                alt="Hex limits"
                className="relative w-64 h-32 border border-primary/30 rounded"
              />
            </div>
          </li>
          <li>
            <span className="font-bold">Set Up Initiative Deck:</span>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
              <li>
                Combine Initiative Cards for explorers and hostile groups and
                shuffle
              </li>
            </ul>
          </li>
        </ol>

        <ol start={4} className="list-decimal list-inside space-y-4 mt-8">
          <li>
            <span className="font-bold">Destiny phase</span>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
              <li>
                <span className="font-bold">Roll Destiny Dice and discard duplicates.</span>
              </li>
            </ul>
          </li>
          <li>
            <span className="font-bold">Initiative phase</span>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
              <li>
                <span className="font-bold">Perform activation rolls:</span>
                <ul className="ml-6 list-disc">
                  <li>
                    Roll 4 Activation Dice for each explorer and place them on
                    their reference card.
                  </li>
                </ul>
              </li>
              <li>
                <span className="font-bold">Determine Initiative:</span>
                <ul className="ml-6 list-disc">
                  <li>
                    Shuffle Initiative Deck and deal cards to the Combat Track.
                  </li>
                  <li>If an Ambush, hostile cards are placed first.</li>
                </ul>
              </li>
              <li>
                <span className="font-bold">Covering fire:</span>
                <ul className="ml-6 list-disc">
                  <li>
                    Two explorers that are visible to each other can swap
                    Initiative Card places.
                  </li>
                  <li>
                    An explorer can only swap once in each Initiative phase.
                  </li>
                </ul>
              </li>
              <li>
                <span className="font-bold">Gambits:</span>
                <ul className="ml-6 list-disc space-y-1">
                  <li>
                    Explorers can use Activation dice to perform a gambit, not a
                    destiny dice.
                  </li>
                  <li>Make an agility roll:</li>
                  <ul className="ml-6 list-disc">
                    <li>Failure: Nothing.</li>
                    <li>Success: Swap Initiative Card with the closest hostile.</li>
                    <li>Critical Success: Swap Initiative Card with any hostile.</li>
                  </ul>
                </ul>
              </li>
            </ul>
          </li>
          <li>
            <span className="font-bold">Activation phase:</span>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
              <li>Perform activation for each Initiative card.</li>
              <li>When finished, turn the card over.</li>
              <li>
                <span className="font-bold">Explorer Actions:</span>
              </li>
              <li>
                <span className="font-bold">Hostile Actions:</span>
              </li>
            </ul>
          </li>
          <li>
            <span className="font-bold">Event phase:</span>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
              <li>
                <span className="font-bold">Decide if combat ends:</span>
                <ul className="ml-6 list-disc">
                  <li>
                    If all explorers are out of action or all in Maglev, combat
                    ends.
                  </li>
                  <li>Remove hostiles.</li>
                  <li>Shuffle Encounter Deck.</li>
                  <li>Remove map.</li>
                  <li>On to recovery step.</li>
                </ul>
              </li>
              <li>
                <span className="font-bold">
                  If combat continues, the leaders make an event roll:
                </span>
                <ul className="ml-6 list-disc">
                  <li>
                    Roll Blackstone die and look up the result on the Event
                    Table.
                  </li>
                  <li>Then move the leader marker and begin the next turn.</li>
                </ul>
              </li>
            </ul>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
