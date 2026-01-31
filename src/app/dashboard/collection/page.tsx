import { requireAuth } from "@/lib/auth/server";

export default async function CollectionPage() {
  await requireAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold">Collection</h1>
      <p className="text-muted-foreground">Your miniature collection will appear here.</p>
    </div>
  );
}