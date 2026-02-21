import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function BsfQuestPage() {
  await requireAuth();

  return (
    <Card className="warhammer-card border-primary/30">
      <CardContent className="p-6">
        <ol className="list-decimal list-inside space-y-4">
          <li>
            <span className="font-bold">Strongholds:</span>
            <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
              <li>
                To find the hidden vault explorers must conquer four strongholds.
              </li>
              <li>
                If the players use 4 clue cards they can attack a stronghold
                instead of a normal expedition:
              </li>
              <ul className="ml-6 list-disc space-y-1">
                <li>The 4 clue cards are shuffled back into the Discovery Deck.</li>
                <li>Stronghold deck is then shuffled and one is selected.</li>
                <li>
                  Explorers then attack the Stronghold using Stronghold rules.
                </li>
              </ul>
              <li>
                If the explorers have conquered 4 Strongholds, an attempt can be
                made on the Hidden Vault using the Hidden Vault rules.
              </li>
            </ul>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
