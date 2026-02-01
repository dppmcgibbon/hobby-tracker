"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { addPaintToInventory } from "@/app/actions/paints";
import { Plus, Search, Check } from "lucide-react";
import type { Paint, UserPaint } from "@/types";

interface PaintCatalogProps {
  paints: Paint[];
  userPaints: UserPaint[];
}

const paintTypeColors: Record<string, string> = {
  base: "bg-amber-500",
  layer: "bg-blue-500",
  shade: "bg-purple-500",
  dry: "bg-orange-500",
  technical: "bg-red-500",
  contrast: "bg-green-500",
  air: "bg-cyan-500",
  spray: "bg-pink-500",
};

export function PaintCatalog({ paints, userPaints }: PaintCatalogProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [adding, setAdding] = useState<string | null>(null);

  const userPaintIds = new Set(userPaints.map((up) => up.paint_id));

  const filteredPaints = paints.filter((paint) => {
    const matchesSearch = paint.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || paint.type === typeFilter;
    const matchesBrand = brandFilter === "all" || paint.brand === brandFilter;
    return matchesSearch && matchesType && matchesBrand;
  });

  const brands = Array.from(new Set(paints.map((p) => p.brand)));
  const types = Array.from(new Set(paints.map((p) => p.type)));

  const handleAdd = async (paintId: string) => {
    setAdding(paintId);
    try {
      await addPaintToInventory({ paint_id: paintId, quantity: 1 });
      router.refresh();
    } catch (error) {
      console.error("Failed to add paint:", error);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search paints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredPaints.length} of {paints.length} paints
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPaints.map((paint) => {
          const inInventory = userPaintIds.has(paint.id);

          return (
            <Card key={paint.id}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded border flex-shrink-0"
                    style={{ backgroundColor: paint.color_hex || "#888" }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-1">{paint.name}</h3>
                    <p className="text-xs text-muted-foreground">{paint.brand}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Badge className={paintTypeColors[paint.type] || "bg-gray-500"}>
                    {paint.type}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                {inInventory ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Check className="mr-2 h-4 w-4" />
                    In Inventory
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleAdd(paint.id)}
                    disabled={adding === paint.id}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {adding === paint.id ? "Adding..." : "Add to Inventory"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
