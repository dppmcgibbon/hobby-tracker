"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useTransition } from "react";

interface GamesSearchProps {
  universes: { id: string; name: string }[];
}

export function GamesSearch({ universes }: GamesSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const search = searchParams.get("search") || "";
  const universeFilter = searchParams.get("universe") || "all";

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      router.push(`/dashboard/games?${params.toString()}`);
    });
  };

  const handleUniverseChange = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("universe");
      } else {
        params.set("universe", value);
      }
      router.push(`/dashboard/games?${params.toString()}`);
    });
  };

  return (
    <div className="flex gap-4">
      <Select value={universeFilter} onValueChange={handleUniverseChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Universes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Universes</SelectItem>
          {universes.map((universe) => (
            <SelectItem key={universe.id} value={universe.id}>
              {universe.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search games..."
          className="pl-10"
          defaultValue={search}
          onChange={handleSearch}
          disabled={isPending}
        />
      </div>
    </div>
  );
}
