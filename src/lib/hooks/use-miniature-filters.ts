"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useDebounce } from "use-debounce";

export interface MiniatureFilters {
  search: string;
  factionIds: string[];
  statuses: string[];
  tagIds: string[];
  tagMatchMode: "any" | "all";
  collectionId?: string;
  sortBy: "name" | "created" | "updated" | "status";
  sortOrder: "asc" | "desc";
}

export function useMiniatureFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: MiniatureFilters = useMemo(() => {
    return {
      search: searchParams.get("search") || "",
      factionIds: searchParams.get("factions")?.split(",").filter(Boolean) || [],
      statuses: searchParams.get("statuses")?.split(",").filter(Boolean) || [],
      tagIds: searchParams.get("tags")?.split(",").filter(Boolean) || [],
      tagMatchMode: (searchParams.get("tagMatch") as "any" | "all") || "any",
      collectionId: searchParams.get("collection") || undefined,
      sortBy: (searchParams.get("sortBy") as MiniatureFilters["sortBy"]) || "created",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    };
  }, [searchParams]);

  const [debouncedSearch] = useDebounce(filters.search, 500);

  const updateFilters = useCallback(
    (updates: Partial<MiniatureFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
          params.delete(key);
        } else if (Array.isArray(value)) {
          params.set(key, value.join(","));
        } else {
          params.set(key, String(value));
        }
      });

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  return {
    filters,
    debouncedSearch,
    updateFilters,
    clearFilters,
  };
}
