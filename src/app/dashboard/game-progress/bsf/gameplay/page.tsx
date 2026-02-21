import { requireAuth } from "@/lib/auth/server";
import { Card, CardContent } from "@/components/ui/card";

const SETUP_STEPS = [
  { title: "Choose Leader" },
  {
    title: "Pick Explorers",
    items: [
      "Place miniatures on Maglev.",
      "Place reference cards beside each player.",
    ],
  },
  {
    title: "Set Up Precipice Board",
    items: [
      "Shuffle and place Discovery Cards.",
      "Create Exploration Deck and place on board.",
      "Place space craft.",
    ],
  },
  {
    title: "Set Up Combat Track",
    items: [
      "Create Encounter Deck and place under Combat Track.",
      "Place miniatures and their reference cards to the right of the Combat Track.",
    ],
  },
  { title: "Place Spacecraft" },
  {
    title: "Place Dice",
    items: [
      "Destiny dice on Precipice Board.",
      "Four Activation Dice beside each character card.",
      "Action dice.",
      "Blackstone die.",
    ],
  },
  { title: "Place Chambers, Portals & Locations" },
  { title: "Set Up Maglev Transport Chamber" },
  { title: "Place Counters and Markers" },
  { title: "Take Reference Booklets" },
  { title: "Place Other Cards & Envelopes" },
  { title: "Begin The Expedition" },
];

export default async function BsfGameplaySetupPage() {
  await requireAuth();

  return (
    <Card className="warhammer-card border-primary/30">
      <CardContent className="p-6">
        <ol className="list-decimal list-inside space-y-4">
          {SETUP_STEPS.map((step, i) => (
            <li key={i} className="text-foreground">
              <span className="font-bold">{step.title}</span>
              {"items" in step && step.items && (
                <ul className="ml-6 mt-2 list-disc space-y-1 text-muted-foreground">
                  {step.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
