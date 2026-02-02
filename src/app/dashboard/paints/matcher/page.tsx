import { createClient } from "@/lib/supabase/server";
import { PaintMatcher } from "@/components/paints/paint-matcher";

export default async function PaintMatcherPage() {
  const supabase = await createClient();

  const { data: paints } = await supabase
    .from("paints")
    .select("id, brand, name, type, color_hex")
    .order("brand", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Paint Color Matcher</h1>
        <p className="text-muted-foreground">Find the closest paint matches to any color</p>
      </div>

      <PaintMatcher paints={paints || []} />
    </div>
  );
}
