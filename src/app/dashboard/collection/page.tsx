import { requireAuth } from "@/lib/auth/server";
import { getMiniatures, getFactions } from "@/lib/queries/miniatures";
import CollectionPageClient from "./collection-client";

export default async function CollectionPage() {
  const user = await requireAuth();
  const [miniatures, factions] = await Promise.all([getMiniatures(user.id), getFactions()]);

  return <CollectionPageClient miniatures={miniatures} factions={factions} />;
}
