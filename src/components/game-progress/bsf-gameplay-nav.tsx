"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const GAMEPLAY_LINKS = [
  { href: "/dashboard/game-progress/bsf/gameplay", label: "Setup" },
  { href: "/dashboard/game-progress/bsf/gameplay/exploration", label: "Exploration" },
  { href: "/dashboard/game-progress/bsf/gameplay/quest", label: "The Quest" },
  { href: "/dashboard/game-progress/bsf/gameplay/special", label: "Special Rules" },
  { href: "/dashboard/game-progress/bsf/gameplay/combat", label: "Combat" },
  { href: "/dashboard/game-progress/bsf/gameplay/explorer", label: "Explorer Actions" },
  { href: "/dashboard/game-progress/bsf/gameplay/hostile", label: "Hostile Actions" },
  { href: "/dashboard/game-progress/bsf/gameplay/precipice", label: "Precipice" },
] as const;

export function BsfGameplayNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-primary/20 pb-3 mb-4">
      {GAMEPLAY_LINKS.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded border transition-all",
              isActive
                ? "bg-primary/20 border-primary text-primary"
                : "border-primary/30 text-muted-foreground hover:text-primary hover:bg-primary/10"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
