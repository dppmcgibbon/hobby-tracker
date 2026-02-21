import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function BsfPrecipicePage() {
  await requireAuth();

  return (
    <Card className="warhammer-card border-primary/30">
      <CardContent className="p-6 space-y-6">
        <p className="text-muted-foreground">
          After each expedition, the battered explorers can return to Precipice
          to rest and recuperate, and plan future expeditions into the Blackstone
          Fortress. Over the course of several expeditions, they will discover
          enough information to attack the strongholds that surround the hidden
          vault, and finally to enter the hidden vault itself.
        </p>

        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide text-primary">
            Legacy Step
          </h3>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-muted-foreground">
            <li>
              <span className="font-bold">Leader shuffles the legacy deck and draws one card.</span>
              <ul className="ml-6 list-disc">
                <li>Card applies to all future expeditions.</li>
              </ul>
            </li>
          </ol>
        </div>

        <div>
          <h3 className="text-lg font-bold uppercase tracking-wide text-primary mt-6">
            Trading Step
          </h3>
          <ol className="list-decimal list-inside mt-2 space-y-2 text-muted-foreground">
            <li>Turn each space craft to facilities side.</li>
            <li>Shuffle resource deck for each space craft.</li>
            <li>
              Place top 3 cards from each deck face up beside appropriate
              spacecraft.
              <ul className="ml-6 list-disc">
                <li>
                  These three cards are the resources that are currently
                  available at that spacecraft.
                </li>
              </ul>
            </li>
            <li>
              Each explorer can travel to a single spacecraft to use its
              facilities and trade with it.
            </li>
            <li>
              Place the explorer&apos;s miniature on the spacecraft they are
              trading with, and completely resolve trading for that explorer.
            </li>
            <ol className="list-decimal list-inside ml-6 space-y-2">
              <li>Use facilities</li>
              <li>
                Trade by converting one or more of their archeotech cards into
                trading points.
                <ul className="ml-6 list-disc space-y-1">
                  <li>
                    The number of trading points an archeotech card is worth is
                    shown at the bottom of the card.
                  </li>
                  <li>
                    The trading points can be used to purchase one or more
                    resource cards available at the spacecraft.
                  </li>
                  <li>
                    The total value of the resource cards purchased must be
                    less than or equal to the total number of trading points.
                  </li>
                  <li>
                    Add 1 to the number of trading points an explorer has when
                    they trade on a spacecraft they are based on. Any unused
                    trading points are lost at the end of the trading step.
                  </li>
                  <li>
                    Place any resource cards that are purchased next to the
                    explorer&apos;s character card, and shuffle the archeotech
                    cards that were converted into trading points back into the
                    discovery deck.
                  </li>
                </ul>
              </li>
            </ol>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
