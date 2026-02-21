"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PLAYERS = [
  { slug: "daithi", label: "Dáithí" },
  { slug: "dee", label: "Dee" },
  { slug: "ian", label: "Ian" },
  { slug: "paul", label: "Paul" },
  { slug: "stronghold", label: "Stronghold" },
] as const;

export function BsfPlayerTabs() {
  const pathname = usePathname();
  const hrefBase = "/dashboard/game-progress/bsf";

  return (
    <ul className="flex flex-wrap gap-1 border-b border-primary/20 pb-4 mb-6">
      {PLAYERS.map(({ slug, label }) => {
        const href = `${hrefBase}/${slug}`;
        const isActive = pathname === href || (pathname === hrefBase && slug === "daithi");
        return (
          <li key={slug}>
            <Link
              href={href}
              className={cn(
                "px-4 py-2 text-sm font-bold uppercase tracking-wide rounded border transition-all inline-block",
                isActive
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-primary/30 text-muted-foreground hover:text-primary hover:bg-primary/10"
              )}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
