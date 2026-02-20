"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { Pipette, Search, TrendingUp } from "lucide-react";
import { findMatchingPaintsDeltaE } from "@/lib/utils/paint-matcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PaintSwatch } from "@/components/paints/paint-swatch";

interface Paint {
  id: string;
  brand: string;
  name: string;
  type: string;
  color_hex: string;
}

interface PaintMatch {
  paint: Paint;
  distance: number;
  percentage: number;
}

interface PaintMatcherProps {
  paints: Paint[];
}

export function PaintMatcher({ paints }: PaintMatcherProps) {
  const [targetColor, setTargetColor] = useState("#3b82f6");
  const [brandFilter, setBrandFilter] = useState<string | undefined>(undefined);

  // Get unique brands
  const brands = Array.from(new Set(paints.map((p) => p.brand))).sort();

  // Calculate matches - react compiler will optimize this
  const matches: PaintMatch[] = findMatchingPaintsDeltaE(targetColor, paints, 10, brandFilter);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pipette className="h-5 w-5" />
            Paint Color Matcher
          </CardTitle>
          <CardDescription>
            Find matching paints from your catalog based on a color. Uses Delta E algorithm for
            perceptually accurate color matching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Target Color</Label>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-shrink-0">
                    <HexColorPicker color={targetColor} onChange={setTargetColor} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={targetColor}
                      onChange={(e) => setTargetColor(e.target.value)}
                      placeholder="#3b82f6"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                    <div
                      className="w-full h-20 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: targetColor }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label>Brand Filter (optional)</Label>
                <Select
                  value={brandFilter}
                  onValueChange={(v) => setBrandFilter(v === "all" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All brands" />
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
              </div>
            </div>

            <div>
              <Label className="mb-3 block">
                <Search className="inline h-4 w-4 mr-2" />
                Top Matches
              </Label>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {matches.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No matches found</p>
                  ) : (
                    matches.map((match, index) => (
                      <Card key={match.paint.id} className="relative overflow-hidden">
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2"
                          style={{ backgroundColor: match.paint.color_hex || "#888" }}
                        />
                        <CardContent className="p-4 pl-6">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  #{index + 1}
                                </Badge>
                                <span className="font-medium">{match.paint.name}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {match.paint.brand} • {match.paint.type}
                              </p>
                            </div>
                            <PaintSwatch
                              type={match.paint.type}
                              name={match.paint.name}
                              colorHex={match.paint.color_hex}
                              size="md"
                              paintId={match.paint.id}
                              brand={match.paint.brand}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Match Quality</span>
                              <span className="font-medium">{match.percentage.toFixed(1)}%</span>
                            </div>
                            <Progress value={match.percentage} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              Delta E: {match.distance.toFixed(2)}
                              {match.distance < 2
                                ? " (Imperceptible)"
                                : match.distance < 5
                                  ? " (Excellent)"
                                  : match.distance < 10
                                    ? " (Good)"
                                    : " (Fair)"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">How it works</p>
              <p className="text-muted-foreground">
                This tool uses the Delta E (CIE76) algorithm to calculate perceptually uniform color
                differences. Lower Delta E values indicate closer color matches. Values under 2 are
                considered imperceptible to the human eye.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
