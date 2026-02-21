import { requireAuth } from "@/lib/auth/server";
import Link from "next/link";
import { BsfNav } from "@/components/game-progress/bsf-nav";
import { ArrowLeft } from "lucide-react";

export default async function BsfLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/game-progress"
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Game progress
        </Link>
      </div>
      <div className="border-l-4 border-primary pl-4">
        <h1 className="text-3xl font-black uppercase tracking-wider text-primary gold-glow">
          Blackstone Fortress
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Warhammer Quest: Blackstone Fortress – rules and current game
        </p>
      </div>
      <BsfNav />
      {children}
    </div>
  );
}
