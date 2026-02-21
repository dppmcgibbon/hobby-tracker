"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const MAIN_LINKS = [
  { href: "/dashboard/game-progress/bsf", label: "Current game" },
  { href: "/dashboard/game-progress/bsf/rulebooks", label: "Rulebooks" },
  { href: "/dashboard/game-progress/bsf/gameplay", label: "Gameplay" },
  { href: "/dashboard/game-progress/bsf/apps", label: "Apps" },
] as const;

export function BsfNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b-2 border-primary/30 pb-4 mb-6">
      {MAIN_LINKS.map(({ href, label }) => {
        const isActive = pathname === href || (href !== "/dashboard/game-progress/bsf" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-4 py-2 text-sm font-bold uppercase tracking-wide rounded border transition-all",
              isActive
                ? "bg-primary/20 border-primary text-primary"
                : "border-primary/30 text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border-primary/50"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
